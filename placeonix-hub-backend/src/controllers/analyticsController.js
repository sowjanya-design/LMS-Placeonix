const User = require('../models/User');
const Course = require('../models/Course');
const Batch = require('../models/Batch');
const Enrollment = require('../models/Enrollment');
const PlacementDrive = require('../models/PlacementDrive');
const Lead = require('../models/Lead');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { getPlacementStats } = require('../utils/placementStats');

// @desc   Admin dashboard overview
// @route  GET /api/v1/analytics/overview
exports.overview = asyncHandler(async (req, res) => {
  const [
    totalStudents, activeStudents, totalMentors,
    totalCourses, publishedCourses,
    activeBatches, totalEnrollments, completedEnrollments,
    openDrives, newLeads, placement,
  ] = await Promise.all([
    User.countDocuments({ role: 'student' }),
    User.countDocuments({ role: 'student', status: 'active' }),
    User.countDocuments({ role: 'mentor' }),
    Course.countDocuments(),
    Course.countDocuments({ isPublished: true }),
    Batch.countDocuments({ status: 'active' }),
    Enrollment.countDocuments(),
    Enrollment.countDocuments({ status: 'completed' }),
    PlacementDrive.countDocuments({ status: 'open' }),
    Lead.countDocuments({ status: 'new' }),
    getPlacementStats(),
  ]);

  return ApiResponse.success(res, 200, 'Overview fetched', {
    students: { total: totalStudents, active: activeStudents },
    mentors: { total: totalMentors },
    courses: { total: totalCourses, published: publishedCourses },
    batches: { active: activeBatches },
    enrollments: { total: totalEnrollments, completed: completedEnrollments },
    placement: { placed: placement.placed, rate: placement.rate, openDrives },
    leads: { new: newLeads },
  });
});

// @desc   Monthly enrollment trends
// @route  GET /api/v1/analytics/enrollments/monthly?year=2025
exports.monthlyEnrollments = asyncHandler(async (req, res) => {
  const year = Number(req.query.year) || new Date().getFullYear();
  const data = await Enrollment.aggregate([
    {
      $match: {
        enrollmentDate: { $gte: new Date(`${year}-01-01`), $lt: new Date(`${year + 1}-01-01`) },
      },
    },
    {
      $group: {
        _id: { $month: '$enrollmentDate' },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // Fill missing months with 0
  const result = Array.from({ length: 12 }, (_, i) => {
    const found = data.find((d) => d._id === i + 1);
    return { month: i + 1, count: found ? found.count : 0 };
  });

  return ApiResponse.success(res, 200, 'Monthly enrollments', { year, data: result });
});

// @desc   Course distribution
// @route  GET /api/v1/analytics/courses/distribution
exports.courseDistribution = asyncHandler(async (req, res) => {
  const data = await Enrollment.aggregate([
    { $group: { _id: '$course', count: { $sum: 1 } } },
    {
      $lookup: {
        from: 'courses',
        localField: '_id',
        foreignField: '_id',
        as: 'course',
      },
    },
    { $unwind: '$course' },
    {
      $project: {
        courseId: '$_id',
        title: '$course.title',
        category: '$course.category',
        color: '$course.color',
        count: 1,
      },
    },
    { $sort: { count: -1 } },
  ]);

  const total = data.reduce((sum, d) => sum + d.count, 0);
  const withPercentage = data.map((d) => ({
    ...d,
    percentage: total > 0 ? Math.round((d.count / total) * 100) : 0,
  }));

  return ApiResponse.success(res, 200, 'Distribution fetched', {
    total, distribution: withPercentage,
  });
});

// @desc   Placement statistics
// @route  GET /api/v1/analytics/placements
exports.placementStats = asyncHandler(async (req, res) => {
  // Headline numbers (applications, placed, rate) come from the same shared
  // helper as /analytics/overview and /placements/analytics — this endpoint
  // used to compute them independently via its own in-memory loop over every
  // drive, which is both a performance anti-pattern at scale and how the
  // three "placement rate" widgets in the app ended up disagreeing with
  // each other. Package/company breakdowns still need per-application detail,
  // so those stay as an aggregation here.
  const [headline, byCompanyAgg, packageAgg] = await Promise.all([
    getPlacementStats(),
    PlacementDrive.aggregate([
      { $unwind: '$applications' },
      { $match: { 'applications.status': 'placed' } },
      { $group: { _id: '$company', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    PlacementDrive.aggregate([
      { $unwind: '$applications' },
      { $match: { 'applications.status': 'placed' } },
      {
        $project: {
          ctc: { $ifNull: ['$applications.finalOffer.ctc', { $ifNull: ['$package.max', 0] } ] },
        },
      },
      { $match: { ctc: { $gt: 0 } } },
      { $group: { _id: null, avg: { $avg: '$ctc' }, max: { $max: '$ctc' }, min: { $min: '$ctc' } } },
    ]),
  ]);

  const pkg = packageAgg[0] || { avg: 0, max: 0, min: 0 };

  return ApiResponse.success(res, 200, 'Placement stats', {
    totalApplications: headline.applied,
    placed: headline.placed,
    placementRate: headline.rate,
    avgPackage: Math.round(pkg.avg || 0),
    highestPackage: pkg.max || 0,
    lowestPackage: pkg.min || 0,
    byCompany: byCompanyAgg.map((r) => ({ company: r._id, count: r.count })),
  });
});

// @desc   Revenue analytics
// @route  GET /api/v1/analytics/revenue
exports.revenue = asyncHandler(async (req, res) => {
  const data = await Enrollment.aggregate([
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$fee.paid' },
        totalDue: { $sum: '$fee.due' },
        totalCommitted: { $sum: '$fee.total' },
      },
    },
  ]);

  const monthly = await Enrollment.aggregate([
    { $unwind: '$fee.payments' },
    {
      $group: {
        _id: {
          year: { $year: '$fee.payments.paidOn' },
          month: { $month: '$fee.payments.paidOn' },
        },
        amount: { $sum: '$fee.payments.amount' },
      },
    },
    { $sort: { '_id.year': -1, '_id.month': -1 } },
    { $limit: 12 },
  ]);

  return ApiResponse.success(res, 200, 'Revenue stats', {
    summary: data[0] || { totalRevenue: 0, totalDue: 0, totalCommitted: 0 },
    monthly,
  });
});
