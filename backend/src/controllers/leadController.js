const Lead = require('../models/Lead');
const AppError = require('../utils/AppError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { sendLeadConfirmationEmail } = require('../services/emailService');

// @desc   Submit inquiry (PUBLIC — from website contact form)
// @route  POST /api/v1/leads
exports.createLead = asyncHandler(async (req, res) => {
  // Public, unauthenticated route — whitelist exactly what an anonymous
  // caller may set. Never spread req.body directly here: it would let
  // anyone forge internal CRM state (status, assignedTo, source, etc).
  const { firstName, lastName, email, phone, message, courseInterested, courseInterestedName } = req.body;
  const lead = await Lead.create({
    firstName,
    lastName,
    email,
    phone,
    message,
    courseInterested,
    courseInterested,
    courseInterestedName,
  });
  
  // Fire and forget email notification
  sendLeadConfirmationEmail(lead).catch((err) => console.error('Failed to send lead email:', err));

  return ApiResponse.created(
    res,
    'Thank you! We will reach out within 24 hours.',
    { leadId: lead._id }
  );
});

// @desc   List leads (admin)
// @route  GET /api/v1/leads
exports.listLeads = asyncHandler(async (req, res) => {
  const { status, source, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (source) filter.source = source;

  const total = await Lead.countDocuments(filter);
  const leads = await Lead.find(filter)
    .populate('courseInterested', 'title')
    .populate('assignedTo', 'firstName lastName')
    .sort('-createdAt')
    .skip((page - 1) * limit)
    .limit(Number(limit));

  return ApiResponse.paginated(res, 'Leads fetched', leads, page, limit, total);
});

// @desc   Get lead
// @route  GET /api/v1/leads/:id
exports.getLead = asyncHandler(async (req, res, next) => {
  const lead = await Lead.findById(req.params.id)
    .populate('courseInterested')
    .populate('assignedTo notes.addedBy', 'firstName lastName');
  if (!lead) return next(new AppError('Lead not found', 404));
  return ApiResponse.success(res, 200, 'Lead fetched', { lead });
});

// @desc   Update lead status / assign
// @route  PATCH /api/v1/leads/:id (admin only — see leadRoutes.js)
exports.updateLead = asyncHandler(async (req, res, next) => {
  // Admin-only route, but still whitelist: email/phone shouldn't be
  // silently reassigned through the status/triage endpoint.
  const { status, source, assignedTo, courseInterested, courseInterestedName } = req.body;
  const updates = { status, source, assignedTo, courseInterested, courseInterestedName };
  Object.keys(updates).forEach((k) => updates[k] === undefined && delete updates[k]);

  if (updates.status === 'contacted') updates.contactedAt = new Date();
  if (updates.status === 'converted') updates.convertedAt = new Date();

  const lead = await Lead.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
  if (!lead) return next(new AppError('Lead not found', 404));
  return ApiResponse.success(res, 200, 'Lead updated', { lead });
});

// @desc   Add note to lead
// @route  POST /api/v1/leads/:id/notes
exports.addNote = asyncHandler(async (req, res, next) => {
  const text = typeof req.body.text === 'string' ? req.body.text.trim() : '';
  if (!text) return next(new AppError('Note text is required', 400));

  const lead = await Lead.findById(req.params.id);
  if (!lead) return next(new AppError('Lead not found', 404));

  lead.notes.push({ text, addedBy: req.user._id });
  await lead.save();
  return ApiResponse.success(res, 200, 'Note added', { lead });
});

// @desc   Delete lead
// @route  DELETE /api/v1/leads/:id
exports.deleteLead = asyncHandler(async (req, res, next) => {
  const lead = await Lead.findByIdAndDelete(req.params.id);
  if (!lead) return next(new AppError('Lead not found', 404));
  return ApiResponse.success(res, 200, 'Lead deleted');
});
