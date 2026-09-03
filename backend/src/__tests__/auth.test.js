process.env.JWT_SECRET = "test-jwt-secret-key-minimum-32-characters-long";
process.env.JWT_REFRESH_SECRET =
  "test-refresh-secret-minimum-32-characters-long";
process.env.NODE_ENV = "test";

const request = require("supertest");
const app = require("../app");
const { connect, disconnect, clear } = require("./setup");
const User = require("../models/User");

describe("Auth API", () => {
  beforeAll(connect);
  afterAll(disconnect);
  afterEach(clear);

  describe("POST /api/v1/auth/register", () => {
    it("should register a new student", async () => {
      const res = await request(app).post("/api/v1/auth/register").send({
        firstName: "Test",
        lastName: "Student",
        email: "test@example.com",
        password: "Password123",
        phone: "+919876543210",
      });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe("test@example.com");
      expect(res.body.data.user.role).toBe("student");
      // Registration doesn't auto-login (no session cookie) — the account
      // still needs a separate /auth/login. It must never leak a token either.
      expect(res.body.data.accessToken).toBeUndefined();
      expect(res.body.data.user.password).toBeUndefined();
    });

    it("should reject duplicate email", async () => {
      await User.create({
        firstName: "A",
        lastName: "B",
        email: "dup@x.com",
        password: "Password123",
      });

      const res = await request(app).post("/api/v1/auth/register").send({
        firstName: "C",
        lastName: "D",
        email: "dup@x.com",
        password: "Password123",
      });

      expect(res.statusCode).toBe(409);
    });

    it("should validate email format", async () => {
      const res = await request(app).post("/api/v1/auth/register").send({
        firstName: "X",
        lastName: "Y",
        email: "not-an-email",
        password: "Password123",
      });

      expect(res.statusCode).toBe(400);
    });

    it("should require minimum password length", async () => {
      const res = await request(app).post("/api/v1/auth/register").send({
        firstName: "A",
        lastName: "B",
        email: "a@b.com",
        password: "short",
      });

      expect(res.statusCode).toBe(400);
    });
  });

  describe("POST /api/v1/auth/login", () => {
    beforeEach(async () => {
      await User.create({
        firstName: "Login",
        lastName: "Test",
        email: "login@test.com",
        password: "Password123",
        status: "active",
      });
    });

    it("should login with valid credentials", async () => {
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({ email: "login@test.com", password: "Password123" });

      expect(res.statusCode).toBe(200);
      // Tokens must be delivered via httpOnly cookies only, never in the JSON body.
      expect(res.body.data.accessToken).toBeUndefined();
      expect(res.body.data.refreshToken).toBeUndefined();
      const cookies = res.headers["set-cookie"];
      expect(
        cookies.some(
          (c) => c.startsWith("accessToken=") && c.includes("HttpOnly"),
        ),
      ).toBe(true);
      expect(
        cookies.some(
          (c) => c.startsWith("refreshToken=") && c.includes("HttpOnly"),
        ),
      ).toBe(true);
    });

    it("should reject wrong password", async () => {
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({ email: "login@test.com", password: "WrongPassword" });

      expect(res.statusCode).toBe(401);
    });

    it("should reject non-existent email", async () => {
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({ email: "nope@test.com", password: "Password123" });

      expect(res.statusCode).toBe(401);
    });
  });

  describe("GET /api/v1/auth/me", () => {
    it("should return current user with valid token", async () => {
      await User.create({
        firstName: "Me",
        lastName: "User",
        email: "me@test.com",
        password: "Password123",
      });

      // Use an agent so the httpOnly cookie set by login is carried into the
      // next request automatically, the same way a real browser would —
      // there is no token in the response body to grab anymore.
      const agent = request.agent(app);
      await agent
        .post("/api/v1/auth/login")
        .send({ email: "me@test.com", password: "Password123" });

      const res = await agent.get("/api/v1/auth/me");

      expect(res.statusCode).toBe(200);
      expect(res.body.data.user.email).toBe("me@test.com");
    });

    it("should reject without token", async () => {
      const res = await request(app).get("/api/v1/auth/me");
      expect(res.statusCode).toBe(401);
    });
  });

  describe("POST /api/v1/auth/logout", () => {
    it("invalidates the access token issued before logout, not just the refresh token", async () => {
      await User.create({
        firstName: "Bye",
        lastName: "User",
        email: "bye@test.com",
        password: "Password123",
      });

      const agent = request.agent(app);
      const loginRes = await agent
        .post("/api/v1/auth/login")
        .send({ email: "bye@test.com", password: "Password123" });

      // Capture the raw access token to replay it independently of the agent's
      // cookie jar (which logout's res.clearCookie would also wipe) -- this
      // simulates an old tab / stolen token still holding the pre-logout JWT.
      const setCookie = loginRes.headers["set-cookie"];
      const accessTokenCookie = setCookie.find((c) =>
        c.startsWith("accessToken="),
      );
      const rawToken = accessTokenCookie.split(";")[0].split("=")[1];

      // The token still works before logout.
      const beforeLogout = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", `Bearer ${rawToken}`);
      expect(beforeLogout.statusCode).toBe(200);

      await agent.post("/api/v1/auth/logout").send({});

      // A stateless JWT re-verified by signature+expiry alone would still pass
      // here without the tokenBlacklistedAt check -- this is exactly the B-06
      // gap: logout must reject it, not just remove the refresh token.
      const afterLogout = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", `Bearer ${rawToken}`);
      expect(afterLogout.statusCode).toBe(401);
    });
  });
});
