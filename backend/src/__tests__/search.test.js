process.env.JWT_SECRET = 'test-jwt-secret-key-minimum-32-characters-long';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-minimum-32-characters-long';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('../app');
const { connect, disconnect, clear } = require('./setup');
const { createUserAndLogin, createCourseAndBatch, auth } = require('./testHelpers');
const Enrollment = require('../models/Enrollment');

describe('Search API — mentor scoping', () => {
  beforeAll(connect);
  afterAll(disconnect);
  afterEach(clear);

  it('does not let a mentor find a student outside their own batches', async () => {
    const { user: mentor, token: mentorToken } = await createUserAndLogin({ role: 'mentor' });
    const { user: admin } = await createUserAndLogin({ role: 'admin' });
    const { user: myStudent } = await createUserAndLogin({ role: 'student', firstName: 'Zaphira' });
    const { user: otherStudent } = await createUserAndLogin({ role: 'student', firstName: 'Zorlana' });

    const { batch } = await createCourseAndBatch(mentor._id, admin._id);
    await Enrollment.create({ student: myStudent._id, batch: batch._id, course: batch.course, status: 'enrolled' });
    // otherStudent is enrolled in no batch of this mentor's.

    const resMine = await request(app)
      .get('/api/v1/search')
      .query({ q: 'Zaphira' })
      .set(auth(mentorToken));
    expect(resMine.statusCode).toBe(200);
    expect(resMine.body.data.results.some((r) => r.id === String(myStudent._id))).toBe(true);

    const resOther = await request(app)
      .get('/api/v1/search')
      .query({ q: 'Zorlana' })
      .set(auth(mentorToken));
    expect(resOther.statusCode).toBe(200);
    expect(resOther.body.data.results.some((r) => r.id === String(otherStudent._id))).toBe(false);
  });

  it('lets an admin find any student', async () => {
    const { token: adminToken } = await createUserAndLogin({ role: 'admin' });
    const { user: student } = await createUserAndLogin({ role: 'student', firstName: 'Quintessa' });

    const res = await request(app)
      .get('/api/v1/search')
      .query({ q: 'Quintessa' })
      .set(auth(adminToken));
    expect(res.statusCode).toBe(200);
    expect(res.body.data.results.some((r) => r.id === String(student._id))).toBe(true);
  });
});
