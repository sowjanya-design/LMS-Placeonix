process.env.JWT_SECRET = "test-jwt-secret-key-minimum-32-characters-long";
process.env.JWT_REFRESH_SECRET =
  "test-refresh-secret-minimum-32-characters-long";
process.env.NODE_ENV = "test";

const request = require("supertest");
const app = require("../app");
const { connect, disconnect, clear } = require("./setup");
const { createUserAndLogin, auth } = require("./testHelpers");

describe("Office Hours API — slot creation", () => {
  beforeAll(connect);
  afterAll(disconnect);
  afterEach(clear);

  it("lets a mentor create a slot without specifying a mentor (self-assigned)", async () => {
    const { user: mentor, token } = await createUserAndLogin({
      role: "mentor",
    });

    const res = await request(app)
      .post("/api/v1/office-hours")
      .set(auth(token))
      .send({ startTime: new Date(Date.now() + 86400000).toISOString() });

    expect(res.statusCode).toBe(201);
    expect(res.body.data.slot.mentor).toBe(String(mentor._id));
  });

  it("rejects an admin-created slot with no mentor specified, with a clear 400 (not a 500)", async () => {
    // Regression test: admin is authorize()'d to POST /office-hours, but the
    // controller only self-assigned `mentor` for role === 'mentor' — an admin
    // request always 500'd with "OfficeHourSlot validation failed: mentor:
    // Path `mentor` is required." Fixed by accepting an explicit `mentor` in
    // the body for admin, and failing fast with a real 400 when it's missing.
    const { token: adminToken } = await createUserAndLogin({ role: "admin" });

    const res = await request(app)
      .post("/api/v1/office-hours")
      .set(auth(adminToken))
      .send({ startTime: new Date(Date.now() + 86400000).toISOString() });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/select a mentor/i);
  });

  it("lets an admin create a slot on behalf of a specific mentor", async () => {
    const { user: mentor } = await createUserAndLogin({ role: "mentor" });
    const { token: adminToken } = await createUserAndLogin({ role: "admin" });

    const res = await request(app)
      .post("/api/v1/office-hours")
      .set(auth(adminToken))
      .send({
        startTime: new Date(Date.now() + 86400000).toISOString(),
        mentor: mentor._id,
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.data.slot.mentor).toBe(String(mentor._id));
  });
});
