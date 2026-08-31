process.env.JWT_SECRET = 'test-jwt-secret-key-minimum-32-characters-long';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-minimum-32-characters-long';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('../app');
const { connect, disconnect, clear } = require('./setup');
const { createUserAndLogin, createCourseAndBatch, auth } = require('./testHelpers');
const Enrollment = require('../models/Enrollment');

describe('Certificates API — issuance', () => {
  beforeAll(connect);
  afterAll(disconnect);
  afterEach(clear);

  it('issues a certificate with an auto-generated certificateNumber', async () => {
    // Regression test: Certificate.certificateNumber is `required: true`, and
    // the generator used to run in a `pre('save')` hook. Mongoose validates a
    // document (which enforces `required`) BEFORE `pre('save')` hooks run, so
    // every issuance failed with "certificateNumber: Path `certificateNumber`
    // is required" — moved the generator to `pre('validate')` to fix it.
    const { user: mentor } = await createUserAndLogin({ role: 'mentor' });
    const { user: student } = await createUserAndLogin({ role: 'student' });
    const { user: admin, token: adminToken } = await createUserAndLogin({ role: 'admin' });
    const { batch, course } = await createCourseAndBatch(mentor._id, admin._id);
    const enrollment = await Enrollment.create({
      student: student._id,
      course: course._id,
      batch: batch._id,
      fee: { total: 1000 },
      finalScore: 92,
      grade: 'A',
    });

    const res = await request(app)
      .post('/api/v1/certificates/issue')
      .set(auth(adminToken))
      .send({ enrollmentId: enrollment._id, type: 'completion' });

    expect(res.statusCode).toBe(201);
    const cert = res.body.data.certificate;
    expect(cert.certificateNumber).toMatch(/^PLX-CERT-\d{4}-\d{5}$/);
    expect(cert.grade).toBe('A');
    expect(cert.score).toBe(92);

    const updatedEnrollment = await Enrollment.findById(enrollment._id);
    expect(updatedEnrollment.certificateIssued).toBe(true);
  }, 10000);

  it('refuses to issue a second certificate for an already-certified enrollment', async () => {
    const { user: mentor } = await createUserAndLogin({ role: 'mentor' });
    const { user: student } = await createUserAndLogin({ role: 'student' });
    const { user: admin, token: adminToken } = await createUserAndLogin({ role: 'admin' });
    const { batch, course } = await createCourseAndBatch(mentor._id, admin._id);
    const enrollment = await Enrollment.create({
      student: student._id,
      course: course._id,
      batch: batch._id,
      fee: { total: 1000 },
    });

    await request(app)
      .post('/api/v1/certificates/issue')
      .set(auth(adminToken))
      .send({ enrollmentId: enrollment._id });

    const secondRes = await request(app)
      .post('/api/v1/certificates/issue')
      .set(auth(adminToken))
      .send({ enrollmentId: enrollment._id });

    expect(secondRes.statusCode).toBe(409);
  }, 10000);

  it('returns a bare array from GET /certificates/me (not wrapped in an object)', async () => {
    // Regression test: myCertificates used to return
    // ApiResponse.success(res, 200, msg, { certificates, count }) — every
    // other "my X" list endpoint in this app (myEnrollments, notifications,
    // etc.) returns the array directly as `data`. The frontend's
    // api.get<Certificate[]>("/certificates/me") assumed the app-wide
    // convention and called `.map()` on the response, which crashed with
    // "certs.map is not a function" because `data` was actually
    // `{certificates: [...], count: N}`, not an array. Fixed by matching the
    // established convention.
    const { user: mentor } = await createUserAndLogin({ role: 'mentor' });
    const { user: student, token: studentToken } = await createUserAndLogin({ role: 'student' });
    const { user: admin, token: adminToken } = await createUserAndLogin({ role: 'admin' });
    const { batch, course } = await createCourseAndBatch(mentor._id, admin._id);
    const enrollment = await Enrollment.create({
      student: student._id,
      course: course._id,
      batch: batch._id,
      fee: { total: 1000 },
    });
    await request(app)
      .post('/api/v1/certificates/issue')
      .set(auth(adminToken))
      .send({ enrollmentId: enrollment._id });

    const res = await request(app).get('/api/v1/certificates/me').set(auth(studentToken));

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(1);
    // Regression: myCertificates didn't populate `student`, so it stayed a
    // bare ObjectId — any view reading cert.student.firstName (the
    // downloadable certificate PDF) silently rendered "undefined undefined".
    expect(res.body.data[0].student.firstName).toBe(student.firstName);
    expect(res.body.data[0].student.lastName).toBe(student.lastName);
  }, 10000);
});
