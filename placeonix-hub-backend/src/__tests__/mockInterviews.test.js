process.env.JWT_SECRET = 'test-jwt-secret-key-minimum-32-characters-long';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-minimum-32-characters-long';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('../app');
const { connect, disconnect, clear } = require('./setup');
const { createUserAndLogin, auth } = require('./testHelpers');
const MockInterview = require('../models/MockInterview');

describe('Mock Interviews API — data leak + ownership', () => {
  beforeAll(connect);
  afterAll(disconnect);
  afterEach(clear);

  it('blocks a student from reading another student\'s mock interview via ?student= override', async () => {
    const { user: interviewer } = await createUserAndLogin({ role: 'mentor' });
    const { user: victim } = await createUserAndLogin({ role: 'student' });
    const { token: attackerToken } = await createUserAndLogin({ role: 'student' });

    await MockInterview.create({
      student: victim._id,
      interviewer: interviewer._id,
      title: 'Confidential feedback session',
      scheduledAt: new Date(),
      status: 'completed',
      overallScore: 91,
      strengths: 'Very strong on system design',
    });

    const res = await request(app)
      .get('/api/v1/mock-interviews')
      .query({ student: victim._id.toString() })
      .set(auth(attackerToken));

    expect(res.statusCode).toBe(200);
    expect(res.body.data.length).toBe(0); // override ignored — attacker sees only their own (empty) scope
  });

  it('lets a mentor/admin filter by an arbitrary student id', async () => {
    const { user: interviewer, token: mentorToken } = await createUserAndLogin({ role: 'mentor' });
    const { user: student } = await createUserAndLogin({ role: 'student' });

    await MockInterview.create({
      student: student._id,
      interviewer: interviewer._id,
      title: 'Round 1',
      scheduledAt: new Date(),
      status: 'scheduled',
    });

    const res = await request(app)
      .get('/api/v1/mock-interviews')
      .query({ student: student._id.toString() })
      .set(auth(mentorToken));
    expect(res.statusCode).toBe(200);
    expect(res.body.data.length).toBe(1);
  });

  it('blocks a different mentor from editing or deleting another mentor\'s mock interview', async () => {
    const { user: owner } = await createUserAndLogin({ role: 'mentor' });
    const { token: intruderToken } = await createUserAndLogin({ role: 'mentor' });
    const { user: student } = await createUserAndLogin({ role: 'student' });

    const mock = await MockInterview.create({
      student: student._id,
      interviewer: owner._id,
      title: 'Owner\'s mock',
      scheduledAt: new Date(),
      status: 'scheduled',
    });

    const updateRes = await request(app)
      .patch(`/api/v1/mock-interviews/${mock._id}`)
      .set(auth(intruderToken))
      .send({ status: 'completed', overallScore: 100 });
    expect(updateRes.statusCode).toBe(403);

    const deleteRes = await request(app)
      .delete(`/api/v1/mock-interviews/${mock._id}`)
      .set(auth(intruderToken));
    expect(deleteRes.statusCode).toBe(403);

    const unchanged = await MockInterview.findById(mock._id);
    expect(unchanged.status).toBe('scheduled');
  });

  it('lets the owning interviewer record feedback', async () => {
    const { user: owner, token: ownerToken } = await createUserAndLogin({ role: 'mentor' });
    const { user: student } = await createUserAndLogin({ role: 'student' });

    const mock = await MockInterview.create({
      student: student._id,
      interviewer: owner._id,
      title: 'Owner\'s mock',
      scheduledAt: new Date(),
      status: 'scheduled',
    });

    const res = await request(app)
      .patch(`/api/v1/mock-interviews/${mock._id}`)
      .set(auth(ownerToken))
      .send({ status: 'completed', overallScore: 85, strengths: 'Good communication' });
    expect(res.statusCode).toBe(200);
    expect(res.body.data.mock.overallScore).toBe(85);
  });
});
