const Alumni = require('../models/Alumni');
const AppError = require('../utils/AppError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

// @desc   List alumni (everyone)
// @route  GET /api/v1/alumni
exports.listAlumni = asyncHandler(async (req, res) => {
  const { search, featured } = req.query;
  const filter = {};
  if (featured === 'true') filter.featured = true;
  if (search) {
    const rx = new RegExp(search, 'i');
    filter.$or = [{ name: rx }, { company: rx }, { role: rx }, { course: rx }];
  }
  const limit = Math.min(Number(req.query.limit) || 100, 200);
  const alumni = await Alumni.find(filter)
    .populate('courseRef', 'title')
    .populate('batchRef', 'name')
    .sort('-featured -placedYear -createdAt')
    .limit(limit);
  return ApiResponse.success(res, 200, 'Alumni fetched', alumni);
});

const ALUMNI_FIELDS = [
  'name', 'photo', 'student', 'course', 'batch', 'courseRef', 'batchRef',
  'company', 'role', 'packageLPA', 'placedYear', 'testimonial', 'linkedIn', 'featured',
];
const pickAlumniFields = (body) => {
  const out = {};
  ALUMNI_FIELDS.forEach((k) => { if (body[k] !== undefined) out[k] = body[k]; });
  // Proper-case the free-text fallbacks so a lowercase entry like "sid" /
  // "sap developer @ avsora" doesn't ship to the public showcase as-is.
  if (typeof out.name === 'string') out.name = out.name.trim().replace(/\b\w/g, (c) => c.toUpperCase());
  if (typeof out.role === 'string') out.role = out.role.trim().replace(/\b\w/g, (c) => c.toUpperCase());
  if (typeof out.company === 'string') out.company = out.company.trim();
  return out;
};

// @desc   Add alumnus (admin)
// @route  POST /api/v1/alumni
exports.createAlumni = asyncHandler(async (req, res) => {
  const alumnus = await Alumni.create({ ...pickAlumniFields(req.body), createdBy: req.user._id });
  return ApiResponse.created(res, 'Alumni added', { alumnus });
});

// @desc   Update alumnus (admin)
// @route  PATCH /api/v1/alumni/:id
exports.updateAlumni = asyncHandler(async (req, res, next) => {
  const alumnus = await Alumni.findByIdAndUpdate(req.params.id, pickAlumniFields(req.body), { new: true, runValidators: true });
  if (!alumnus) return next(new AppError('Alumni not found', 404));
  return ApiResponse.success(res, 200, 'Alumni updated', { alumnus });
});

// @desc   Delete alumnus (admin)
// @route  DELETE /api/v1/alumni/:id
exports.deleteAlumni = asyncHandler(async (req, res, next) => {
  const alumnus = await Alumni.findByIdAndDelete(req.params.id);
  if (!alumnus) return next(new AppError('Alumni not found', 404));
  return ApiResponse.success(res, 200, 'Alumni removed');
});
