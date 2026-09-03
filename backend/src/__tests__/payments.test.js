process.env.JWT_SECRET = "test-jwt-secret-key-minimum-32-characters-long";
process.env.JWT_REFRESH_SECRET =
  "test-refresh-secret-minimum-32-characters-long";
process.env.NODE_ENV = "test";

const request = require("supertest");
const app = require("../app");
const { connect, disconnect, clear } = require("./setup");
const {
  createUserAndLogin,
  createCourseAndBatch,
  auth,
} = require("./testHelpers");
const Enrollment = require("../models/Enrollment");
const Payment = require("../models/Payment");

describe("Payments API — self-report integrity + access scope", () => {
  beforeAll(connect);
  afterAll(disconnect);
  afterEach(clear);

  it("creates a student-submitted payment as pending, never completed, and does not touch the enrollment balance", async () => {
    const { user: mentor } = await createUserAndLogin({ role: "mentor" });
    const { user: student, token } = await createUserAndLogin({
      role: "student",
    });
    const { batch, course } = await createCourseAndBatch(
      mentor._id,
      mentor._id,
    );
    const enrollment = await Enrollment.create({
      student: student._id,
      course: course._id,
      batch: batch._id,
      fee: { total: 10000, paid: 0, due: 10000 },
    });

    const res = await request(app)
      .post("/api/v1/payments/me/pay")
      .set(auth(token))
      .send({ enrollmentId: enrollment._id, amount: 5000, method: "upi" });

    expect(res.statusCode).toBe(201);
    expect(res.body.data.payment.status).toBe("pending");

    const unchanged = await Enrollment.findById(enrollment._id);
    expect(unchanged.fee.paid).toBe(0);
    expect(unchanged.fee.due).toBe(10000);
  });

  it("only applies the enrollment balance when an admin confirms the payment as completed", async () => {
    const { user: mentor } = await createUserAndLogin({ role: "mentor" });
    const { user: student, token: studentToken } = await createUserAndLogin({
      role: "student",
    });
    const { user: admin, token: adminToken } = await createUserAndLogin({
      role: "admin",
    });
    const { batch, course } = await createCourseAndBatch(mentor._id, admin._id);
    const enrollment = await Enrollment.create({
      student: student._id,
      course: course._id,
      batch: batch._id,
      fee: { total: 10000, paid: 0, due: 10000 },
    });

    const payRes = await request(app)
      .post("/api/v1/payments/me/pay")
      .set(auth(studentToken))
      .send({ enrollmentId: enrollment._id, amount: 5000, method: "upi" });
    const paymentId = payRes.body.data.payment._id;

    const confirmRes = await request(app)
      .patch(`/api/v1/payments/${paymentId}`)
      .set(auth(adminToken))
      .send({ status: "completed" });
    expect(confirmRes.statusCode).toBe(200);

    const updated = await Enrollment.findById(enrollment._id);
    expect(updated.fee.paid).toBe(5000);
    expect(updated.fee.due).toBe(5000);
  });

  it("refunding with no amount (= full refund) sets status to refunded, not partial-refund, and blocks a second refund", async () => {
    // Regression test: refundPayment used `amount >= payment.amount` where a
    // blank/omitted `amount` is `undefined` — `undefined >= N` is always false
    // in JS, so every full refund (the documented "leave blank" UX) silently
    // landed on 'partial-refund' instead of 'refunded'. That defeats the
    // `if (payment.status === 'refunded') return ...already refunded` guard,
    // letting the same payment be "refunded" over and over.
    const { user: mentor } = await createUserAndLogin({ role: "mentor" });
    const { user: student } = await createUserAndLogin({ role: "student" });
    const { user: admin, token: adminToken } = await createUserAndLogin({
      role: "admin",
    });
    const { batch, course } = await createCourseAndBatch(mentor._id, admin._id);
    const enrollment = await Enrollment.create({
      student: student._id,
      course: course._id,
      batch: batch._id,
      fee: { total: 5000, paid: 0, due: 5000 },
    });

    const recordRes = await request(app)
      .post("/api/v1/payments")
      .set(auth(adminToken))
      .send({ enrollmentId: enrollment._id, amount: 5000, method: "cash" });
    const paymentId = recordRes.body.data.payment._id;

    const refundRes = await request(app)
      .post(`/api/v1/payments/${paymentId}/refund`)
      .set(auth(adminToken))
      .send({ reason: "test" }); // no `amount` — the "refund in full" path

    expect(refundRes.statusCode).toBe(200);
    expect(refundRes.body.data.payment.status).toBe("refunded");
    expect(refundRes.body.data.payment.refund.amount).toBe(5000);

    const updated = await Enrollment.findById(enrollment._id);
    expect(updated.fee.paid).toBe(0);
    expect(updated.fee.due).toBe(5000);

    const secondRefundRes = await request(app)
      .post(`/api/v1/payments/${paymentId}/refund`)
      .set(auth(adminToken))
      .send({ reason: "test again" });
    expect(secondRefundRes.statusCode).toBe(400);
    expect(secondRefundRes.body.message).toMatch(/already refunded/i);
  });

  it("rejects amount/status fields updatePayment does not whitelist (cannot inflate the amount post-hoc)", async () => {
    const { user: mentor } = await createUserAndLogin({ role: "mentor" });
    const { user: student, token: studentToken } = await createUserAndLogin({
      role: "student",
    });
    const { user: admin, token: adminToken } = await createUserAndLogin({
      role: "admin",
    });
    const { batch, course } = await createCourseAndBatch(mentor._id, admin._id);
    const enrollment = await Enrollment.create({
      student: student._id,
      course: course._id,
      batch: batch._id,
      fee: { total: 10000, paid: 0, due: 10000 },
    });
    const payRes = await request(app)
      .post("/api/v1/payments/me/pay")
      .set(auth(studentToken))
      .send({ enrollmentId: enrollment._id, amount: 1000, method: "upi" });
    const paymentId = payRes.body.data.payment._id;

    await request(app)
      .patch(`/api/v1/payments/${paymentId}`)
      .set(auth(adminToken))
      .send({ status: "completed", amount: 999999 }); // amount not in the whitelist

    const payment = await Payment.findById(paymentId);
    expect(payment.amount).toBe(1000); // unchanged — amount is not editable via updatePayment
  });

  it("blocks a mentor from listing all students' payments (route-level authorize)", async () => {
    const { token: mentorToken } = await createUserAndLogin({ role: "mentor" });
    const res = await request(app)
      .get("/api/v1/payments")
      .set(auth(mentorToken));
    expect(res.statusCode).toBe(403);
  });

  it("scopes a student's payment list to their own records only", async () => {
    const { user: mentor } = await createUserAndLogin({ role: "mentor" });
    const { user: studentA, token: tokenA } = await createUserAndLogin({
      role: "student",
    });
    const { user: studentB } = await createUserAndLogin({ role: "student" });
    const { batch, course } = await createCourseAndBatch(
      mentor._id,
      mentor._id,
    );
    const enrollA = await Enrollment.create({
      student: studentA._id,
      course: course._id,
      batch: batch._id,
      fee: { total: 100, paid: 0, due: 100 },
    });
    const enrollB = await Enrollment.create({
      student: studentB._id,
      course: course._id,
      batch: batch._id,
      fee: { total: 100, paid: 0, due: 100 },
    });
    await Payment.create({
      enrollment: enrollA._id,
      student: studentA._id,
      amount: 50,
      method: "upi",
      status: "completed",
    });
    await Payment.create({
      enrollment: enrollB._id,
      student: studentB._id,
      amount: 50,
      method: "upi",
      status: "completed",
    });

    const res = await request(app).get("/api/v1/payments").set(auth(tokenA));
    expect(res.statusCode).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(
      String(res.body.data[0].student._id || res.body.data[0].student),
    ).toBe(String(studentA._id));
  });
});
