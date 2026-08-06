process.env.JWT_SECRET = 'test-jwt-secret-key-minimum-32-characters-long';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-minimum-32-characters-long';
process.env.NODE_ENV = 'test';

// Never hit the real executor in tests — mock it and assert on how the
// controller uses its result (grading, masking, ownership), not on the
// external service itself.
jest.mock('../services/codeExecutionService', () => ({
  executeCode: jest.fn(),
  LANGUAGES: {
    javascript: { pistonLanguage: 'javascript', version: '18.15.0', label: 'JavaScript (Node 18)' },
    python: { pistonLanguage: 'python', version: '3.10.0', label: 'Python 3.10' },
  },
}));

const request = require('supertest');
const app = require('../app');
const { connect, disconnect, clear } = require('./setup');
const { createUserAndLogin, createCourseAndBatch, auth } = require('./testHelpers');
const CodingChallenge = require('../models/CodingChallenge');
const CodingSubmission = require('../models/CodingSubmission');
const Enrollment = require('../models/Enrollment');
const { executeCode } = require('../services/codeExecutionService');

async function makeChallenge(mentor, batch, overrides = {}) {
  return CodingChallenge.create({
    title: 'Add two numbers',
    description: 'Read two ints from stdin, print their sum',
    course: batch.course,
    batch: batch._id,
    status: 'published',
    maxAttempts: 2,
    testCases: [
      { input: '2 2', expectedOutput: '4', isHidden: false, points: 1 },
      { input: '3 4', expectedOutput: '7', isHidden: true, points: 2 },
    ],
    createdBy: mentor._id,
    ...overrides,
  });
}

describe('Coding Challenges API — sandboxed execution + grading integrity', () => {
  beforeAll(connect);
  afterAll(disconnect);
  afterEach(async () => {
    await clear();
    executeCode.mockReset();
  });

  it('never leaks hidden test cases\' expectedOutput to a student', async () => {
    const { user: mentor } = await createUserAndLogin({ role: 'mentor' });
    const { user: student, token: studentToken } = await createUserAndLogin({ role: 'student' });
    const { batch, course } = await createCourseAndBatch(mentor._id, mentor._id);
    await Enrollment.create({ student: student._id, course: course._id, batch: batch._id, fee: { total: 0, paid: 0, due: 0 } });
    const challenge = await makeChallenge(mentor, batch);

    const res = await request(app).get(`/api/v1/coding-challenges/${challenge._id}`).set(auth(studentToken));
    expect(res.statusCode).toBe(200);
    const hiddenTc = res.body.data.challenge.testCases.find((tc) => tc.isHidden);
    expect(hiddenTc.expectedOutput).toBeUndefined();
    expect(hiddenTc.input).toBeUndefined();
    // The non-hidden test case's expectedOutput IS shown to students — that's
    // the sample case they're meant to see, not part of the answer key.
    const visibleTc = res.body.data.challenge.testCases.find((tc) => !tc.isHidden);
    expect(visibleTc.expectedOutput).toBe('4');
  });

  it('grades server-side and never returns hidden test cases\' actual stdout/stderr', async () => {
    const { user: mentor } = await createUserAndLogin({ role: 'mentor' });
    const { user: student, token: studentToken } = await createUserAndLogin({ role: 'student' });
    const { batch, course } = await createCourseAndBatch(mentor._id, mentor._id);
    await Enrollment.create({ student: student._id, course: course._id, batch: batch._id, fee: { total: 0, paid: 0, due: 0 } });
    const challenge = await makeChallenge(mentor, batch);

    executeCode.mockImplementation(async ({ stdin }) => {
      if (stdin === '2 2') return { stdout: '4', stderr: '', exitCode: 0, timedOut: false };
      if (stdin === '3 4') return { stdout: '7', stderr: '', exitCode: 0, timedOut: false };
      return { stdout: '', stderr: 'unexpected input', exitCode: 1, timedOut: false };
    });

    const res = await request(app)
      .post(`/api/v1/coding-challenges/${challenge._id}/submit`)
      .set(auth(studentToken))
      .send({ language: 'javascript', code: 'sum program' });

    expect(res.statusCode).toBe(201);
    const submission = res.body.data.submission;
    expect(submission.score).toBe(3);
    expect(submission.maxScore).toBe(3);
    expect(submission.passed).toBe(true);
    const hiddenResult = submission.results.find((r) => r.isHidden);
    expect(hiddenResult.passed).toBe(true);
    expect(hiddenResult.stdout).toBeUndefined();
    expect(hiddenResult.stderr).toBeUndefined();
    const visibleResult = submission.results.find((r) => !r.isHidden);
    expect(visibleResult.stdout).toBe('4');
  });

  it('marks a test case failed on wrong output without trusting any client-side claim', async () => {
    const { user: mentor } = await createUserAndLogin({ role: 'mentor' });
    const { user: student, token: studentToken } = await createUserAndLogin({ role: 'student' });
    const { batch, course } = await createCourseAndBatch(mentor._id, mentor._id);
    await Enrollment.create({ student: student._id, course: course._id, batch: batch._id, fee: { total: 0, paid: 0, due: 0 } });
    const challenge = await makeChallenge(mentor, batch);

    executeCode.mockResolvedValue({ stdout: 'wrong', stderr: '', exitCode: 0, timedOut: false });

    const res = await request(app)
      .post(`/api/v1/coding-challenges/${challenge._id}/submit`)
      .set(auth(studentToken))
      .send({ language: 'javascript', code: 'broken program' });

    expect(res.statusCode).toBe(201);
    expect(res.body.data.submission.score).toBe(0);
    expect(res.body.data.submission.passed).toBe(false);
  });

  it('rejects a language not in the challenge\'s allowedLanguages', async () => {
    const { user: mentor } = await createUserAndLogin({ role: 'mentor' });
    const { user: student, token: studentToken } = await createUserAndLogin({ role: 'student' });
    const { batch, course } = await createCourseAndBatch(mentor._id, mentor._id);
    await Enrollment.create({ student: student._id, course: course._id, batch: batch._id, fee: { total: 0, paid: 0, due: 0 } });
    const challenge = await makeChallenge(mentor, batch, { allowedLanguages: ['python'] });

    const res = await request(app)
      .post(`/api/v1/coding-challenges/${challenge._id}/run`)
      .set(auth(studentToken))
      .send({ language: 'javascript', code: 'console.log(1)' });

    expect(res.statusCode).toBe(400);
    expect(executeCode).not.toHaveBeenCalled();
  });

  it('blocks a non-enrolled student from submitting', async () => {
    const { user: mentor } = await createUserAndLogin({ role: 'mentor' });
    const { token: studentToken } = await createUserAndLogin({ role: 'student' });
    const { batch } = await createCourseAndBatch(mentor._id, mentor._id);
    const challenge = await makeChallenge(mentor, batch);

    const res = await request(app)
      .post(`/api/v1/coding-challenges/${challenge._id}/submit`)
      .set(auth(studentToken))
      .send({ language: 'javascript', code: 'x' });
    expect(res.statusCode).toBe(403);
    expect(executeCode).not.toHaveBeenCalled();
  });

  it('rejects submission once maxAttempts is exhausted', async () => {
    const { user: mentor } = await createUserAndLogin({ role: 'mentor' });
    const { user: student, token: studentToken } = await createUserAndLogin({ role: 'student' });
    const { batch, course } = await createCourseAndBatch(mentor._id, mentor._id);
    await Enrollment.create({ student: student._id, course: course._id, batch: batch._id, fee: { total: 0, paid: 0, due: 0 } });
    const challenge = await makeChallenge(mentor, batch, { maxAttempts: 1 });
    await CodingSubmission.create({
      challenge: challenge._id, student: student._id, batch: batch._id,
      language: 'javascript', code: 'x', attemptNumber: 1, status: 'graded',
    });

    const res = await request(app)
      .post(`/api/v1/coding-challenges/${challenge._id}/submit`)
      .set(auth(studentToken))
      .send({ language: 'javascript', code: 'y' });
    expect(res.statusCode).toBe(400);
  });

  it('blocks a mentor from editing another mentor\'s batch challenge', async () => {
    const { user: owner } = await createUserAndLogin({ role: 'mentor' });
    const { token: intruderToken } = await createUserAndLogin({ role: 'mentor' });
    const { batch } = await createCourseAndBatch(owner._id, owner._id);
    const challenge = await makeChallenge(owner, batch);

    const res = await request(app)
      .patch(`/api/v1/coding-challenges/${challenge._id}`)
      .set(auth(intruderToken))
      .send({ title: 'Hijacked' });
    expect(res.statusCode).toBe(403);
  });
});
