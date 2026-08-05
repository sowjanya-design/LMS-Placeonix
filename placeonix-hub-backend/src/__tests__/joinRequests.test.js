process.env.JWT_SECRET = 'test-jwt-secret-key-minimum-32-characters-long';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-minimum-32-characters-long';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('../app');
const { connect, disconnect, clear } = require('./setup');
const { createUserAndLogin, createCourseAndBatch, auth } = require('./testHelpers');

describe('Join Requests API — ownership enforcement', () => {
  beforeAll(connect);
  afterAll(disconnect);
  afterEach(clear);

  it('lets a student create a join request for their batch\'s mentor', async () => {
    const { user: mentor } = await createUserAndLogin({ role: 'mentor' });
    const { token: studentToken } = await createUserAndLogin({ role: 'student' });
    const { batch } = await createCourseAndBatch(mentor._id, mentor._id);

    const res = await request(app)
      .post('/api/v1/join-requests')
      .set(auth(studentToken))
      .send({ batchId: batch._id, reason: 'Traveling, need to join online' });
    expect(res.statusCode).toBe(201);
    expect(res.body.data.mentor.toString ? res.body.data.mentor.toString() : res.body.data.mentor).toBe(String(mentor._id));
  });

  it('blocks a different mentor from approving/rejecting a request that is not theirs', async () => {
    const { user: owner } = await createUserAndLogin({ role: 'mentor' });
    const { token: intruderToken } = await createUserAndLogin({ role: 'mentor' });
    const { token: studentToken } = await createUserAndLogin({ role: 'student' });
    const { batch } = await createCourseAndBatch(owner._id, owner._id);

    const createRes = await request(app)
      .post('/api/v1/join-requests')
      .set(auth(studentToken))
      .send({ batchId: batch._id, reason: 'Need to join' });
    const requestId = createRes.body.data._id;

    const res = await request(app)
      .patch(`/api/v1/join-requests/${requestId}`)
      .set(auth(intruderToken))
      .send({ status: 'approved', meetingLink: 'https://meet.example.com/x' });
    expect(res.statusCode).toBe(403);
  });

  it('lets the owning mentor approve the request', async () => {
    const { user: owner, token: ownerToken } = await createUserAndLogin({ role: 'mentor' });
    const { token: studentToken } = await createUserAndLogin({ role: 'student' });
    const { batch } = await createCourseAndBatch(owner._id, owner._id);

    const createRes = await request(app)
      .post('/api/v1/join-requests')
      .set(auth(studentToken))
      .send({ batchId: batch._id, reason: 'Need to join' });
    const requestId = createRes.body.data._id;

    const res = await request(app)
      .patch(`/api/v1/join-requests/${requestId}`)
      .set(auth(ownerToken))
      .send({ status: 'approved', meetingLink: 'https://meet.example.com/x' });
    expect(res.statusCode).toBe(200);
    expect(res.body.data.status).toBe('approved');
  });

  it('scopes list() to a mentor\'s own requests and a student\'s own requests', async () => {
    const { user: mentorA, token: tokenA } = await createUserAndLogin({ role: 'mentor' });
    const { user: mentorB } = await createUserAndLogin({ role: 'mentor' });
    const { token: studentToken } = await createUserAndLogin({ role: 'student' });
    const { batch: batchA } = await createCourseAndBatch(mentorA._id, mentorA._id);
    const { batch: batchB } = await createCourseAndBatch(mentorB._id, mentorB._id);

    await request(app).post('/api/v1/join-requests').set(auth(studentToken)).send({ batchId: batchA._id, reason: 'a' });
    await request(app).post('/api/v1/join-requests').set(auth(studentToken)).send({ batchId: batchB._id, reason: 'b' });

    const res = await request(app).get('/api/v1/join-requests').set(auth(tokenA));
    expect(res.statusCode).toBe(200);
    expect(res.body.data.length).toBe(1);
  });
});
