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
const Session = require("../models/Session");

describe("Sessions API — ownership enforcement", () => {
  beforeAll(connect);
  afterAll(disconnect);
  afterEach(clear);

  it("lets a mentor create and update their own session", async () => {
    const { user: mentor, token } = await createUserAndLogin({
      role: "mentor",
    });
    const { batch } = await createCourseAndBatch(mentor._id, mentor._id);

    const createRes = await request(app)
      .post("/api/v1/sessions")
      .set(auth(token))
      .send({
        batch: batch._id,
        title: "Intro",
        startTime: new Date(),
        endTime: new Date(Date.now() + 3600000),
      });
    expect(createRes.statusCode).toBe(201);

    const sessionId = createRes.body.data.session._id;
    const updateRes = await request(app)
      .patch(`/api/v1/sessions/${sessionId}`)
      .set(auth(token))
      .send({ title: "Updated title" });
    expect(updateRes.statusCode).toBe(200);
    expect(updateRes.body.data.session.title).toBe("Updated title");
  });

  it("blocks a different mentor from updating, deleting, starting, or completing a session they do not own", async () => {
    const { user: owner } = await createUserAndLogin({ role: "mentor" });
    const { token: intruderToken } = await createUserAndLogin({
      role: "mentor",
    });
    const { batch } = await createCourseAndBatch(owner._id, owner._id);

    const session = await Session.create({
      batch: batch._id,
      course: batch.course,
      instructor: owner._id,
      title: "Owner session",
      startTime: new Date(),
      endTime: new Date(Date.now() + 3600000),
      createdBy: owner._id,
    });

    const attempts = [
      request(app)
        .patch(`/api/v1/sessions/${session._id}`)
        .set(auth(intruderToken))
        .send({ title: "Hijacked" }),
      request(app)
        .delete(`/api/v1/sessions/${session._id}`)
        .set(auth(intruderToken)),
      request(app)
        .patch(`/api/v1/sessions/${session._id}/start`)
        .set(auth(intruderToken)),
      request(app)
        .patch(`/api/v1/sessions/${session._id}/complete`)
        .set(auth(intruderToken))
        .send({}),
    ];
    const results = await Promise.all(attempts);
    results.forEach((res) => expect(res.statusCode).toBe(403));

    const unchanged = await Session.findById(session._id);
    expect(unchanged.title).toBe("Owner session");
    expect(unchanged.status).toBe("scheduled");
  });

  it("lets an admin manage any mentor's session", async () => {
    const { user: mentor } = await createUserAndLogin({ role: "mentor" });
    const { user: admin, token: adminToken } = await createUserAndLogin({
      role: "admin",
    });
    const { batch } = await createCourseAndBatch(mentor._id, admin._id);

    const session = await Session.create({
      batch: batch._id,
      course: batch.course,
      instructor: mentor._id,
      title: "Mentor session",
      startTime: new Date(),
      endTime: new Date(Date.now() + 3600000),
      createdBy: mentor._id,
    });

    const res = await request(app)
      .patch(`/api/v1/sessions/${session._id}`)
      .set(auth(adminToken))
      .send({ title: "Admin edited" });
    expect(res.statusCode).toBe(200);
  });

  it("rejects an invalid meetingLink format", async () => {
    const { user: mentor, token } = await createUserAndLogin({
      role: "mentor",
    });
    const { batch } = await createCourseAndBatch(mentor._id, mentor._id);

    const res = await request(app)
      .post("/api/v1/sessions")
      .set(auth(token))
      .send({
        batch: batch._id,
        title: "Bad link",
        startTime: new Date(),
        endTime: new Date(Date.now() + 3600000),
        meetingLink: "not-a-url",
      });
    expect(res.statusCode).toBe(400);
  });
});
