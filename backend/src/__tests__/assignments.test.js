process.env.JWT_SECRET = 'test-jwt-secret-key-minimum-32-characters-long';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-minimum-32-characters-long';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('../app');
const { connect, disconnect, clear } = require('./setup');
const { createUserAndLogin, createCourseAndBatch, auth } = require('./testHelpers');
const Assignment = require('../models/Assignment');
const Enrollment = require('../models/Enrollment');

async function makeAssignment(mentor, batch) {
  return Assignment.create({
    title: 'HW1',
    description: 'Do the thing',
    course: batch.course,
    batch: batch._id,
    dueDate: new Date(Date.now() + 7 * 86400000),
    maxScore: 100,
    createdBy: mentor._id,
  });
}

describe('Assignments API — ownership + grading', () => {
  beforeAll(connect);
  afterAll(disconnect);
  afterEach(clear);

  it('blocks a mentor from editing/deleting/grading another mentor\'s batch assignment', async () => {
    const { user: owner } = await createUserAndLogin({ role: 'mentor' });
    const { token: intruderToken } = await createUserAndLogin({ role: 'mentor' });
    const { batch } = await createCourseAndBatch(owner._id, owner._id);
    const assignment = await makeAssignment(owner, batch);

    const updateRes = await request(app)
      .patch(`/api/v1/assignments/${assignment._id}`)
      .set(auth(intruderToken))
      .send({ title: 'Hijacked' });
    expect(updateRes.statusCode).toBe(403);

    const deleteRes = await request(app)
      .delete(`/api/v1/assignments/${assignment._id}`)
      .set(auth(intruderToken));
    expect(deleteRes.statusCode).toBe(403);

    assignment.submissions.push({ student: owner._id, status: 'submitted' });
    await assignment.save();
    const submissionId = assignment.submissions[0]._id;
    const reviewRes = await request(app)
      .post(`/api/v1/assignments/${assignment._id}/submissions/${submissionId}/review`)
      .set(auth(intruderToken))
      .send({ score: 90 });
    expect(reviewRes.statusCode).toBe(403);
  });

  it('rejects a grading score outside 0-maxScore', async () => {
    const { user: mentor, token } = await createUserAndLogin({ role: 'mentor' });
    const { user: student } = await createUserAndLogin({ role: 'student' });
    const { batch } = await createCourseAndBatch(mentor._id, mentor._id);
    const assignment = await makeAssignment(mentor, batch);
    assignment.submissions.push({ student: student._id, status: 'submitted' });
    await assignment.save();
    const submissionId = assignment.submissions[0]._id;

    const res = await request(app)
      .post(`/api/v1/assignments/${assignment._id}/submissions/${submissionId}/review`)
      .set(auth(token))
      .send({ score: 150 });
    expect(res.statusCode).toBe(400);
  });

  it('lets the owning mentor grade within range', async () => {
    const { user: mentor, token } = await createUserAndLogin({ role: 'mentor' });
    const { user: student } = await createUserAndLogin({ role: 'student' });
    const { batch } = await createCourseAndBatch(mentor._id, mentor._id);
    const assignment = await makeAssignment(mentor, batch);
    assignment.submissions.push({ student: student._id, status: 'submitted' });
    await assignment.save();
    const submissionId = assignment.submissions[0]._id;

    const res = await request(app)
      .post(`/api/v1/assignments/${assignment._id}/submissions/${submissionId}/review`)
      .set(auth(token))
      .send({ score: 88, feedback: 'Good job' });
    expect(res.statusCode).toBe(200);
    expect(res.body.data.submission.score).toBe(88);
  });

  it('lets an enrolled student submit an assignment', async () => {
    const { user: mentor } = await createUserAndLogin({ role: 'mentor' });
    const { user: student, token: studentToken } = await createUserAndLogin({ role: 'student' });
    const { batch, course } = await createCourseAndBatch(mentor._id, mentor._id);
    await Enrollment.create({ student: student._id, course: course._id, batch: batch._id, fee: { total: 0, paid: 0, due: 0 } });
    const assignment = await makeAssignment(mentor, batch);

    const res = await request(app)
      .post(`/api/v1/assignments/${assignment._id}/submit`)
      .set(auth(studentToken))
      .send({ content: 'My work', githubLink: 'https://github.com/x/y' });
    expect(res.statusCode).toBe(200);
  });

  it('blocks a non-enrolled student from submitting', async () => {
    const { user: mentor } = await createUserAndLogin({ role: 'mentor' });
    const { token: studentToken } = await createUserAndLogin({ role: 'student' });
    const { batch } = await createCourseAndBatch(mentor._id, mentor._id);
    const assignment = await makeAssignment(mentor, batch);

    const res = await request(app)
      .post(`/api/v1/assignments/${assignment._id}/submit`)
      .set(auth(studentToken))
      .send({ content: 'Sneaky' });
    expect(res.statusCode).toBe(403);
  });

  it('never shows a student a classmate\'s submission via the list endpoint', async () => {
    const { user: mentor, token: mentorToken } = await createUserAndLogin({ role: 'mentor' });
    const { user: studentA, token: tokenA } = await createUserAndLogin({ role: 'student' });
    const { user: studentB } = await createUserAndLogin({ role: 'student' });
    const { batch, course } = await createCourseAndBatch(mentor._id, mentor._id);
    await Enrollment.create({ student: studentA._id, course: course._id, batch: batch._id, fee: { total: 0, paid: 0, due: 0 } });
    await Enrollment.create({ student: studentB._id, course: course._id, batch: batch._id, fee: { total: 0, paid: 0, due: 0 } });
    const assignment = await makeAssignment(mentor, batch);
    assignment.submissions.push(
      { student: studentA._id, status: 'submitted', content: 'A\'s secret work' },
      { student: studentB._id, status: 'submitted', content: 'B\'s secret work' }
    );
    await assignment.save();

    const resA = await request(app).get('/api/v1/assignments').set(auth(tokenA));
    expect(resA.statusCode).toBe(200);
    const seenByA = resA.body.data[0].submissions;
    expect(seenByA).toHaveLength(1);
    expect(seenByA[0].content).toBe('A\'s secret work');
    expect(JSON.stringify(resA.body)).not.toContain('B\'s secret work');

    const resMentor = await request(app).get('/api/v1/assignments').set(auth(mentorToken));
    expect(resMentor.body.data[0].submissions).toHaveLength(2);
  });
});
