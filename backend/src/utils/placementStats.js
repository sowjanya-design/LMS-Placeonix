const PlacementDrive = require('../models/PlacementDrive');

/**
 * Single source of truth for "how many students are placed" and the
 * resulting placement rate. Previously the Dashboard overview endpoint
 * counted Enrollment.certificateIssued (course-completion certificates,
 * unrelated to job placement) while the Placements analytics endpoint
 * counted actual PlacementDrive application status — two different
 * metrics under the same "Placement Rate" label, which is why they showed
 * different numbers for the same data. Both endpoints now call this.
 */
const getPlacementStats = async () => {
  const [totalApplications, placedCount] = await Promise.all([
    PlacementDrive.aggregate([
      { $project: { count: { $size: { $ifNull: ['$applications', []] } } } },
      { $group: { _id: null, total: { $sum: '$count' } } },
    ]),
    PlacementDrive.aggregate([
      { $unwind: '$applications' },
      { $match: { 'applications.status': 'placed' } },
      { $count: 'total' },
    ]),
  ]);

  const applied = totalApplications[0]?.total || 0;
  const placed = placedCount[0]?.total || 0;
  const rate = applied > 0 ? Math.round((placed / applied) * 100) : 0;

  return { applied, placed, rate };
};

module.exports = { getPlacementStats };
