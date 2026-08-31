process.env.JWT_SECRET = 'test-jwt-secret-key-minimum-32-characters-long';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-minimum-32-characters-long';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('../app');
const { connect, disconnect, clear } = require('./setup');
const { createUserAndLogin, createCourseAndBatch, auth } = require('./testHelpers');
const Enrollment = require('../models/Enrollment');

describe('Batches API — bulk email', () => {
  beforeAll(connect);
  afterAll(disconnect);
  afterEach(clear);

  it('emails every enrolled student in the batch', async () => {
    const { user: admin, token: adminToken } = await createUserAndLogin({ role: 'admin' });
    const { user: mentor } = await createUserAndLogin({ role: 'mentor' });
    const { batch } = await createCourseAndBatch(mentor._id, admin._id);
    const { user: studentA } = await createUserAndLogin({ role: 'student', email: 'bulk-a@test.com' });
    const { user: studentB } = await createUserAndLogin({ role: 'student', email: 'bulk-b@test.com' });
    await Enrollment.create({ student: studentA._id, batch: batch._id, course: batch.course });
    await Enrollment.create({ student: studentB._id, batch: batch._id, course: batch.course });

    const res = await request(app)
      .post(`/api/v1/batches/${batch._id}/bulk-email`)
      .set(auth(adminToken))
      .send({ subject: 'Reminder', body: '<p>Class moved to 6pm.</p>' });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.sent).toBe(2);
    expect(res.body.data.total).toBe(2);
  });

  it('rejects a mentor (batches are admin-managed)', async () => {
    const { user: admin } = await createUserAndLogin({ role: 'admin' });
    const { user: mentor, token: mentorToken } = await createUserAndLogin({ role: 'mentor' });
    const { batch } = await createCourseAndBatch(mentor._id, admin._id);

    const res = await request(app)
      .post(`/api/v1/batches/${batch._id}/bulk-email`)
      .set(auth(mentorToken))
      .send({ subject: 'Reminder', body: 'Hello' });

    expect(res.statusCode).toBe(403);
  });

  it('rejects with no enrolled students', async () => {
    const { user: admin, token: adminToken } = await createUserAndLogin({ role: 'admin' });
    const { user: mentor } = await createUserAndLogin({ role: 'mentor' });
    const { batch } = await createCourseAndBatch(mentor._id, admin._id);

    const res = await request(app)
      .post(`/api/v1/batches/${batch._id}/bulk-email`)
      .set(auth(adminToken))
      .send({ subject: 'Reminder', body: 'Hello' });

    expect(res.statusCode).toBe(400);
  });
});
