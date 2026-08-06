const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongod;
beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});
afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

test('all three placement-rate endpoints agree', async () => {
  const User = require('../models/User');
  const Course = require('../models/Course');
  const Batch = require('../models/Batch');
  const Enrollment = require('../models/Enrollment');
  const PlacementDrive = require('../models/PlacementDrive');

  const admin = await User.create({ firstName: 'A', lastName: 'B', email: 'a@x.com', password: 'Password123', role: 'admin' });
  const mentor = await User.create({ firstName: 'M', lastName: 'N', email: 'm@x.com', password: 'Password123', role: 'mentor' });
  const student = await User.create({ firstName: 'S', lastName: 'T', email: 's@x.com', password: 'Password123', role: 'student' });
  const course = await Course.create({ title: 'T', category: 'Web Development', description: 'x', duration: '3 months', fee: { amount: 1000 }, createdBy: admin._id });
  const batch = await Batch.create({ name: 'B1', code: 'B1X', course: course._id, mentor: mentor._id, startDate: new Date(), endDate: new Date(Date.now() + 30 * 86400000), createdBy: admin._id });
  await Enrollment.create({ student: student._id, course: course._id, batch: batch._id, fee: { total: 1000, paid: 0, due: 1000 } });
  await PlacementDrive.create({
    company: 'Acme', role: 'SDE', applicationDeadline: new Date(Date.now() + 86400000),
    package: { min: 500000, max: 800000 }, createdBy: admin._id,
    applications: [
      { student: student._id, status: 'placed', finalOffer: { ctc: 900000 } },
      { student: student._id, status: 'applied' },
    ],
  });

  const analyticsCtrl = require('../controllers/analyticsController');
  const placementCtrl = require('../controllers/placementController');
  const mkRes = () => { const r = {}; r.json = (p) => { r.payload = p; return r; }; r.status = () => r; return r; };

  const overviewRes = mkRes();
  await analyticsCtrl.overview({}, overviewRes, (e) => { throw e; });
  const placementStatsRes = mkRes();
  await analyticsCtrl.placementStats({}, placementStatsRes, (e) => { throw e; });
  const placementAnalyticsRes = mkRes();
  await placementCtrl.placementAnalytics({}, placementAnalyticsRes, (e) => { throw e; });

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
