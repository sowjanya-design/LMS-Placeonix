process.env.JWT_SECRET = "test-jwt-secret-key-minimum-32-characters-long";
process.env.JWT_REFRESH_SECRET =
  "test-refresh-secret-minimum-32-characters-long";
process.env.NODE_ENV = "test";

const request = require("supertest");
const app = require("../app");
const { connect, disconnect, clear } = require("./setup");
const { createUserAndLogin, auth } = require("./testHelpers");

describe("GET /api/v1/users/birthdays", () => {
  beforeAll(connect);
  afterAll(disconnect);
  afterEach(clear);

  it("returns month/day for students with a DOB set, never the raw date or email", async () => {
    await createUserAndLogin({
      role: "student",
      firstName: "Priya",
      lastName: "Sharma",
      dateOfBirth: new Date("2001-03-15T00:00:00.000Z"),
    });
    // No DOB set — must be excluded.
    await createUserAndLogin({
      role: "student",
      firstName: "No",
      lastName: "Birthday",
    });
    const { token } = await createUserAndLogin({ role: "student" });

    const res = await request(app)
      .get("/api/v1/users/birthdays")
      .set(auth(token));

    expect(res.statusCode).toBe(200);
    expect(res.body.data.length).toBe(1);
    const entry = res.body.data[0];
    expect(entry.name).toBe("Priya Sharma");
    expect(entry.month).toBe(3);
    expect(entry.day).toBe(15);
    expect(entry.dateOfBirth).toBeUndefined();
    expect(entry.email).toBeUndefined();
  });

  it("is reachable by any authenticated role, not just admin/mentor", async () => {
    const { token } = await createUserAndLogin({ role: "student" });
    const res = await request(app)
      .get("/api/v1/users/birthdays")
      .set(auth(token));
    expect(res.statusCode).toBe(200);
  });

  it("does not shadow GET /users/:id — an id-like path still resolves normally", async () => {
    const { user, token: adminToken } = await createUserAndLogin({
      role: "admin",
    });
    const res = await request(app)
      .get(`/api/v1/users/${user._id}`)
      .set(auth(adminToken));
    expect(res.statusCode).toBe(200);
  });
});
