process.env.JWT_SECRET = 'test-jwt-secret-key-minimum-32-characters-long';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-minimum-32-characters-long';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('../app');
const { connect, disconnect, clear } = require('./setup');
const { createUserAndLogin, createCourseAndBatch, auth } = require('./testHelpers');
const Quiz = require('../models/Quiz');
const QuizResult = require('../models/QuizResult');
const Enrollment = require('../models/Enrollment');

async function makeQuiz(mentor, batch, overrides = {}) {
  return Quiz.create({
    title: 'JS Basics',
    course: batch.course,
    batch: batch._id,
    status: 'published',
    passingScorePercent: 50,
    maxAttempts: 1,
    questions: [
      {
        text: 'Which are primitive types?',
        type: 'multi',
        points: 2,
        options: [
          { text: 'string', isCorrect: true },
          { text: 'number', isCorrect: true },
          { text: 'object', isCorrect: false },
        ],
      },
      {
        text: '2 + 2 = ?',
        type: 'single',
        points: 1,
        options: [
          { text: '3', isCorrect: false },
          { text: '4', isCorrect: true },
        ],
      },
    ],
    createdBy: mentor._id,
    ...overrides,
  });
}

describe('Quizzes API — grading integrity + access control', () => {
  beforeAll(connect);
  afterAll(disconnect);
  afterEach(clear);

  it('never leaks isCorrect to a student fetching the quiz before attempting it', async () => {
    const { user: mentor } = await createUserAndLogin({ role: 'mentor' });
    const { user: student, token: studentToken } = await createUserAndLogin({ role: 'student' });
    const { batch, course } = await createCourseAndBatch(mentor._id, mentor._id);
    await Enrollment.create({ student: student._id, course: course._id, batch: batch._id, fee: { total: 0, paid: 0, due: 0 } });
    const quiz = await makeQuiz(mentor, batch);

    const res = await request(app).get(`/api/v1/quizzes/${quiz._id}`).set(auth(studentToken));
    expect(res.statusCode).toBe(200);
    const raw = JSON.stringify(res.body);
    expect(raw).not.toMatch(/isCorrect/);
  });

  it('blocks a non-enrolled student from starting an attempt', async () => {
    const { user: mentor } = await createUserAndLogin({ role: 'mentor' });
    const { token: studentToken } = await createUserAndLogin({ role: 'student' });
    const { batch } = await createCourseAndBatch(mentor._id, mentor._id);
    const quiz = await makeQuiz(mentor, batch);

    const res = await request(app).post(`/api/v1/quizzes/${quiz._id}/attempts`).set(auth(studentToken));
    expect(res.statusCode).toBe(403);
  });

  it('grades server-side from the stored answer key, ignoring any client-claimed correctness', async () => {
    const { user: mentor } = await createUserAndLogin({ role: 'mentor' });
    const { user: student, token: studentToken } = await createUserAndLogin({ role: 'student' });
    const { batch, course } = await createCourseAndBatch(mentor._id, mentor._id);
    await Enrollment.create({ student: student._id, course: course._id, batch: batch._id, fee: { total: 0, paid: 0, due: 0 } });
    const quiz = await makeQuiz(mentor, batch);

    const startRes = await request(app).post(`/api/v1/quizzes/${quiz._id}/attempts`).set(auth(studentToken));
    expect(startRes.statusCode).toBe(201);
    const attemptId = startRes.body.data.attempt._id;

    const q1 = quiz.questions[0]; // multi: string+number correct, 2 pts
    const q2 = quiz.questions[1]; // single: '4' correct, 1 pt
    const wrongOption = q2.options.find((o) => !o.isCorrect);

    const submitRes = await request(app)
      .post(`/api/v1/quizzes/${quiz._id}/attempts/${attemptId}/submit`)
      .set(auth(studentToken))
      .send({
        answers: [
          { question: q1._id, selectedOptions: q1.options.filter((o) => o.isCorrect).map((o) => o._id) },
          // Student (or a tampered client) claims correctness on a wrong answer —
          // server must grade from Quiz.questions, not trust the client at all.
          { question: q2._id, selectedOptions: [wrongOption._id], isCorrect: true, pointsAwarded: 1 },
        ],
      });

    expect(submitRes.statusCode).toBe(200);
    const attempt = submitRes.body.data.attempt;
    expect(attempt.score).toBe(2); // only q1 correct
    expect(attempt.maxScore).toBe(3);
    expect(attempt.passed).toBe(true); // 2/3 = 66% >= 50%
    expect(attempt.answers.find((a) => a.question === String(q2._id)).isCorrect).toBe(false);
  });

  it('rejects a second attempt once maxAttempts is exhausted', async () => {
    const { user: mentor } = await createUserAndLogin({ role: 'mentor' });
    const { user: student, token: studentToken } = await createUserAndLogin({ role: 'student' });
    const { batch, course } = await createCourseAndBatch(mentor._id, mentor._id);
    await Enrollment.create({ student: student._id, course: course._id, batch: batch._id, fee: { total: 0, paid: 0, due: 0 } });
    const quiz = await makeQuiz(mentor, batch, { maxAttempts: 1 });

    await QuizResult.create({
      quiz: quiz._id, student: student._id, batch: batch._id,
      attemptNumber: 1, status: 'submitted', submittedAt: new Date(),
    });

    const res = await request(app).post(`/api/v1/quizzes/${quiz._id}/attempts`).set(auth(studentToken));
    expect(res.statusCode).toBe(400);
  });

  it('blocks a mentor from editing another mentor\'s batch quiz', async () => {
    const { user: owner } = await createUserAndLogin({ role: 'mentor' });
    const { token: intruderToken } = await createUserAndLogin({ role: 'mentor' });
    const { batch } = await createCourseAndBatch(owner._id, owner._id);
    const quiz = await makeQuiz(owner, batch);

    const res = await request(app)
      .patch(`/api/v1/quizzes/${quiz._id}`)
      .set(auth(intruderToken))
      .send({ title: 'Hijacked' });
    expect(res.statusCode).toBe(403);
  });

  it('blocks a student from viewing another student\'s attempt', async () => {
    const { user: mentor } = await createUserAndLogin({ role: 'mentor' });
    const { user: studentA, token: tokenA } = await createUserAndLogin({ role: 'student' });
    const { user: studentB } = await createUserAndLogin({ role: 'student' });
    const { batch, course } = await createCourseAndBatch(mentor._id, mentor._id);
    await Enrollment.create({ student: studentA._id, course: course._id, batch: batch._id, fee: { total: 0, paid: 0, due: 0 } });
    const quiz = await makeQuiz(mentor, batch);

    const attempt = await QuizResult.create({
      quiz: quiz._id, student: studentB._id, batch: batch._id, attemptNumber: 1,
    });

    const res = await request(app)
      .post(`/api/v1/quizzes/${quiz._id}/attempts/${attempt._id}/submit`)
      .set(auth(tokenA))
      .send({ answers: [] });
    expect(res.statusCode).toBe(403);
  });
});
