const { connect, disconnect, clear } = require("./setup");

beforeAll(connect);
afterAll(disconnect);
// Both tests in this file assert on absolute counts (not just ratios), so
// they need a clean slate — without this, the second test's aggregation
// picks up the first test's PlacementDrive too (same DB, same connection).
afterEach(clear);

test("all three placement-rate endpoints agree", async () => {
  const User = require("../models/User");
  const Course = require("../models/Course");
  const Batch = require("../models/Batch");
  const Enrollment = require("../models/Enrollment");
  const PlacementDrive = require("../models/PlacementDrive");

  const admin = await User.create({
    firstName: "A",
    lastName: "B",
    email: "a@x.com",
    password: "Password123",
    role: "admin",
  });
  const mentor = await User.create({
    firstName: "M",
    lastName: "N",
    email: "m@x.com",
    password: "Password123",
    role: "mentor",
  });
  const student = await User.create({
    firstName: "S",
    lastName: "T",
    email: "s@x.com",
    password: "Password123",
    role: "student",
  });
  const course = await Course.create({
    title: "T",
    category: "Web Development",
    description: "x",
    duration: "3 months",
    fee: { amount: 1000 },
    createdBy: admin._id,
  });
  const batch = await Batch.create({
    name: "B1",
    code: "B1X",
    course: course._id,
    mentor: mentor._id,
    startDate: new Date(),
    endDate: new Date(Date.now() + 30 * 86400000),
    createdBy: admin._id,
  });
  await Enrollment.create({
    student: student._id,
    course: course._id,
    batch: batch._id,
    fee: { total: 1000, paid: 0, due: 1000 },
  });
  await PlacementDrive.create({
    company: "Acme",
    role: "SDE",
    applicationDeadline: new Date(Date.now() + 86400000),
    package: { min: 500000, max: 800000 },
    createdBy: admin._id,
    applications: [
      { student: student._id, status: "placed", finalOffer: { ctc: 900000 } },
      { student: student._id, status: "applied" },
    ],
  });

  const analyticsCtrl = require("../controllers/analyticsController");
  const placementCtrl = require("../controllers/placementController");
  const mkRes = () => {
    const r = {};
    r.json = (p) => {
      r.payload = p;
      return r;
    };
    r.status = () => r;
    return r;
  };

  const overviewRes = mkRes();
  await analyticsCtrl.overview({}, overviewRes, (e) => {
    throw e;
  });
  const placementStatsRes = mkRes();
  await analyticsCtrl.placementStats({}, placementStatsRes, (e) => {
    throw e;
  });
  const placementAnalyticsRes = mkRes();
  await placementCtrl.placementAnalytics({}, placementAnalyticsRes, (e) => {
    throw e;
  });

  const overviewRate = overviewRes.payload.data.placement.rate;
  const statsRate = placementStatsRes.payload.data.placementRate;
  const analyticsRate = placementAnalyticsRes.payload.data.placementRate;

  expect(overviewRate).toBe(statsRate);
  expect(statsRate).toBe(analyticsRate);
  expect(overviewRate).toBe(50); // 1 placed / 2 applications

  expect(overviewRes.payload.data.placement.placed).toBe(1);
  expect(placementStatsRes.payload.data.placed).toBe(1);
  expect(placementAnalyticsRes.payload.data.placed).toBe(1);
});

test("placement funnel counts are cumulative and monotonically non-increasing", async () => {
  const User = require("../models/User");
  const PlacementDrive = require("../models/PlacementDrive");

  const admin = await User.create({
    firstName: "A2",
    lastName: "B2",
    email: "a2@x.com",
    password: "Password123",
    role: "admin",
  });
  // Sequential, not Promise.all — concurrent student creates can race on the
  // auto-generated studentProfile.enrollmentId and collide (unrelated to what
  // this test is checking).
  const students = [];
  for (let i = 0; i < 5; i++) {
    students.push(
      await User.create({
        firstName: "S",
        lastName: String(i),
        email: `funnel${i}@x.com`,
        password: "Password123",
        role: "student",
      }),
    );
  }

  // 1 applied-only, 1 shortlisted, 1 interview_scheduled, 1 offered, 1 placed.
  const statuses = [
    "applied",
    "shortlisted",
    "interview_scheduled",
    "offered",
    "placed",
  ];
  await PlacementDrive.create({
    company: "FunnelCo",
    role: "SDE",
    applicationDeadline: new Date(Date.now() + 86400000),
    package: { min: 500000, max: 800000 },
    createdBy: admin._id,
    applications: students.map((s, i) => ({
      student: s._id,
      status: statuses[i],
    })),
  });

  const analyticsCtrl = require("../controllers/analyticsController");
  const mkRes = () => {
    const r = {};
    r.json = (p) => {
      r.payload = p;
      return r;
    };
    r.status = () => r;
    return r;
  };

  const res = mkRes();
  await analyticsCtrl.placementStats({}, res, (e) => {
    throw e;
  });
  const { funnel } = res.payload.data;

  expect(funnel.map((f) => f.stage)).toEqual([
    "applied",
    "shortlisted",
    "interview_scheduled",
    "offered",
    "placed",
  ]);
  // Cumulative: applied=5 (everyone reached at least "applied"), shortlisted=4, ..., placed=1.
  expect(funnel.map((f) => f.count)).toEqual([5, 4, 3, 2, 1]);
  for (let i = 1; i < funnel.length; i++) {
    expect(funnel[i].count).toBeLessThanOrEqual(funnel[i - 1].count);
  }
});
