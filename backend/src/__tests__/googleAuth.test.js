process.env.JWT_SECRET = 'test-jwt-secret-key-minimum-32-characters-long';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-minimum-32-characters-long';
process.env.NODE_ENV = 'test';
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';

// Mock google-auth-library so the test never makes a real network call to
// Google — verifyIdToken's payload is controlled per-test below.
let mockPayload;
jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: jest.fn().mockImplementation(() => {
      if (mockPayload === 'THROW') throw new Error('invalid token');
      return Promise.resolve({ getPayload: () => mockPayload });
    }),
  })),
}));

const request = require('supertest');
const app = require('../app');
const { connect, disconnect, clear } = require('./setup');
const { createUserAndLogin } = require('./testHelpers');
const User = require('../models/User');

describe('POST /api/v1/auth/google', () => {
  beforeAll(connect);
  afterAll(disconnect);
  afterEach(clear);

  it('logs in an existing user matched by verified Google email, and links googleId', async () => {
    const { user } = await createUserAndLogin({ email: 'real.student@gmail.com', role: 'student' });
    mockPayload = { email: 'real.student@gmail.com', email_verified: true, sub: 'google-sub-123' };

    const res = await request(app).post('/api/v1/auth/google').send({ credential: 'fake-jwt' });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.user.email).toBe('real.student@gmail.com');
    // Tokens must never appear in the body — cookie-only, same rule as /login.
    expect(res.body.data.accessToken).toBeUndefined();

    const updated = await User.findById(user._id).select('+googleId');
    expect(updated.googleId).toBe('google-sub-123');
  });

  it('refuses an unrecognized Google email rather than auto-creating an account', async () => {
    mockPayload = { email: 'stranger@gmail.com', email_verified: true, sub: 'google-sub-999' };

    const res = await request(app).post('/api/v1/auth/google').send({ credential: 'fake-jwt' });

    expect(res.statusCode).toBe(403);
    expect(await User.countDocuments({ email: 'stranger@gmail.com' })).toBe(0);
  });

  it('refuses an unverified Google email', async () => {
    await createUserAndLogin({ email: 'unverified@gmail.com', role: 'student' });
    mockPayload = { email: 'unverified@gmail.com', email_verified: false, sub: 'google-sub-1' };

    const res = await request(app).post('/api/v1/auth/google').send({ credential: 'fake-jwt' });
    expect(res.statusCode).toBe(401);
  });

  it('refuses a suspended account', async () => {
    await createUserAndLogin({ email: 'suspended@gmail.com', role: 'student', status: 'suspended' });
    mockPayload = { email: 'suspended@gmail.com', email_verified: true, sub: 'google-sub-2' };

    const res = await request(app).post('/api/v1/auth/google').send({ credential: 'fake-jwt' });
    expect(res.statusCode).toBe(403);
  });

  it('rejects a bad/expired Google token', async () => {
    mockPayload = 'THROW';
    const res = await request(app).post('/api/v1/auth/google').send({ credential: 'garbage' });
    expect(res.statusCode).toBe(401);
  });

  it('returns 501 when GOOGLE_CLIENT_ID is not configured', async () => {
    delete process.env.GOOGLE_CLIENT_ID;
    mockPayload = { email: 'anyone@gmail.com', email_verified: true, sub: 'x' };
    const res = await request(app).post('/api/v1/auth/google').send({ credential: 'fake-jwt' });
    expect(res.statusCode).toBe(501);
    process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
  });
});
