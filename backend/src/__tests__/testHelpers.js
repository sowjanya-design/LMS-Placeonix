const User = require("../models/User");
const Course = require("../models/Course");
const Batch = require("../models/Batch");
const { generateAccessToken } = require("../utils/jwt");

// Creates a user directly and signs a token with the same helper the app
// uses at login — login itself is covered end-to-end in auth.test.js, and
// going through the real /auth/login endpoint from every other test file
// exhausts the authLimiter (10 requests/15min) across a full test run.
async function createUserAndLogin(overrides = {}) {
  const email =
    overrides.email ||
    `u${Date.now()}${Math.random().toString(36).slice(2)}@test.com`;
  const user = await User.create({
    firstName: "Test",
    lastName: "User",
    email,
    password: "Password123",
    role: "student",
    status: "active",
    ...overrides,
  });
  const token = generateAccessToken({
    id: user._id,
    role: user.role,
    email: user.email,
  });
  return { user, token };
}

async function createCourseAndBatch(mentorId, adminId) {
  const unique = Date.now() + Math.random().toString(36).slice(2);
  const course = await Course.create({
    title: "Test Course " + unique,
    category: "Web Development",
    description: "x",
    duration: "3 months",
    fee: { amount: 1000 },
    createdBy: adminId,
  });
  const batch = await Batch.create({
    name: "Batch A",
    code: "BA" + Date.now() + Math.floor(Math.random() * 1000),
    course: course._id,
    mentor: mentorId,
    startDate: new Date(),
    endDate: new Date(Date.now() + 30 * 86400000),
    createdBy: adminId,
  });
  return { course, batch };
}

const auth = (token) => ({ Authorization: `Bearer ${token}` });

module.exports = { createUserAndLogin, createCourseAndBatch, auth };
