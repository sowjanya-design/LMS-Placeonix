const mongoose = require('mongoose');
const Attendance = require('../models/Attendance');
const CorrectionRequest = require('../models/CorrectionRequest');
const AttendanceSettings = require('../models/AttendanceSettings');
const Enrollment = require('../models/Enrollment');
const Batch = require('../models/Batch');
const AppError = require('../utils/AppError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { ATTENDANCE } = require('../config/constants');
const { auditLog } = require('../utils/audit');

// Helper to get today's date normalized
const getTodayDate = () => {
  const d = new Date();
  d.setUTCHours(0,0,0,0);
  return d;
};

// --- PUNCH WIDGET (STUDENT) ---

exports.getTodayStatus = asyncHandler(async (req, res) => {
  const date = getTodayDate();
  let record = await Attendance.findOne({ student: req.user._id, date });
  return ApiResponse.success(res, 200, 'Today status', { record });
});

exports.punchIn = asyncHandler(async (req, res, next) => {
  const date = getTodayDate();
  let record = await Attendance.findOne({ student: req.user._id, date });
  
  if (record && record.inTime) {
    return next(new AppError('Already punched in today', 400));
  }

  // Find student's active batch to assign mentor
  const enrollment = await Enrollment.findOne({ student: req.user._id, status: 'enrolled' }).populate('batch');
  const batchId = enrollment ? enrollment.batch._id : undefined;
  const mentorId = enrollment && enrollment.batch ? enrollment.batch.mentor : undefined;

  if (!record) {
    record = new Attendance({
      student: req.user._id,
      date,
      batch: batchId,
      mentor: mentorId,
      status: ATTENDANCE.ON_DUTY,
      inTime: new Date(),
    });
  } else {
    record.inTime = new Date();
    record.status = ATTENDANCE.ON_DUTY;
  }
  
  record.auditLog.push({
    action: 'punch_in',
    actorId: req.user._id,
    actorRole: 'student',
    timestamp: new Date()
  });

  await record.save();
  return ApiResponse.success(res, 200, 'Punched in', { record });
});

exports.breakStart = asyncHandler(async (req, res, next) => {
  const date = getTodayDate();
  const record = await Attendance.findOne({ student: req.user._id, date });
  if (!record || !record.inTime || record.outTime) {
    return next(new AppError('Invalid state for break', 400));
  }

  record.breaks.push({ start: new Date() });
  
  record.auditLog.push({
    action: 'break_start',
    actorId: req.user._id,
    actorRole: 'student',
    timestamp: new Date()
  });

  await record.save();
  return ApiResponse.success(res, 200, 'Break started', { record });
});

exports.breakEnd = asyncHandler(async (req, res, next) => {
  const date = getTodayDate();
  const record = await Attendance.findOne({ student: req.user._id, date });
  if (!record || !record.breaks.length) return next(new AppError('No active break', 400));
  
  const currentBreak = record.breaks[record.breaks.length - 1];
  if (currentBreak.end) return next(new AppError('Break already ended', 400));

  currentBreak.end = new Date();
  currentBreak.durationMinutes = Math.round((currentBreak.end - currentBreak.start) / 60000);
  
  record.totalBreakMinutes = record.breaks.reduce((acc, b) => acc + (b.durationMinutes || 0), 0);
  
  record.auditLog.push({
    action: 'break_end',
    actorId: req.user._id,
    actorRole: 'student',
    timestamp: new Date()
  });

  await record.save();
  return ApiResponse.success(res, 200, 'Break ended', { record });
});

exports.punchOut = asyncHandler(async (req, res, next) => {
  const date = getTodayDate();
  const record = await Attendance.findOne({ student: req.user._id, date });
  if (!record || !record.inTime || record.outTime) {
    return next(new AppError('Cannot punch out', 400));
  }

  // Close active break if exists
  const currentBreak = record.breaks.length ? record.breaks[record.breaks.length - 1] : null;
  if (currentBreak && !currentBreak.end) {
    currentBreak.end = new Date();
    currentBreak.durationMinutes = Math.round((currentBreak.end - currentBreak.start) / 60000);
    record.totalBreakMinutes = record.breaks.reduce((acc, b) => acc + (b.durationMinutes || 0), 0);
  }

  record.outTime = new Date();
  record.totalWorkingMinutes = Math.max(0, Math.round((record.outTime - record.inTime) / 60000) - record.totalBreakMinutes);

  // Compute final status based on thresholds
  let settings = await AttendanceSettings.findOne();
  if (!settings) settings = await AttendanceSettings.create({});

  if (record.totalWorkingMinutes >= settings.presentThresholdMinutes) {
    record.status = ATTENDANCE.PRESENT;
  } else if (record.totalWorkingMinutes >= settings.halfDayThresholdMinutes) {
    record.status = ATTENDANCE.HALF_DAY;
  } else {
    record.status = ATTENDANCE.ABSENT;
  }

  record.auditLog.push({
    action: 'punch_out',
    actorId: req.user._id,
    actorRole: 'student',
    newValue: record.status,
    timestamp: new Date()
  });

  await record.save();
  return ApiResponse.success(res, 200, 'Punched out', { record });
});

// --- CORRECTIONS ---

exports.raiseCorrection = asyncHandler(async (req, res, next) => {
  const { date, reason, description } = req.body;
  if (!date || !reason || !description) return next(new AppError('Missing fields', 400));
  
  const targetDate = new Date(date);
  targetDate.setUTCHours(0,0,0,0);

  const reqObj = await CorrectionRequest.create({
    student: req.user._id,
    date: targetDate,
    reason,
    description,
    status: 'Pending'
  });

  return ApiResponse.success(res, 201, 'Correction raised', { request: reqObj });
});

exports.getCorrectionRequests = asyncHandler(async (req, res) => {
  let filter = {};
  if (req.user.role === 'mentor') {
    // Only students enrolled in mentor's batches
    const myBatches = await Batch.find({ mentor: req.user._id }).select('_id');
    const enrollments = await Enrollment.find({ batch: { $in: myBatches } }).select('student');
    filter.student = { $in: enrollments.map(e => e.student) };
  }
  const requests = await CorrectionRequest.find(filter).populate('student', 'firstName lastName avatar email').sort('-createdAt');
  return ApiResponse.success(res, 200, 'Correction requests', { requests });
});

exports.approveCorrection = asyncHandler(async (req, res, next) => {
  const cr = await CorrectionRequest.findById(req.params.id);
  if (!cr) return next(new AppError('Not found', 404));

  const { newStatus, inTime, outTime, remark } = req.body;
  if (!newStatus) return next(new AppError('newStatus is required', 400));

  cr.status = 'Approved';
  cr.reviewedBy = req.user._id;
  cr.reviewRemark = remark;
  cr.resolvedAt = new Date();
  await cr.save();

  // Update or create Attendance
  let record = await Attendance.findOne({ student: cr.student, date: cr.date });
  if (!record) {
    record = new Attendance({ student: cr.student, date: cr.date });
  }

  const oldStatus = record.status;
  record.status = newStatus;
  if (inTime) record.inTime = new Date(inTime);
  if (outTime) record.outTime = new Date(outTime);
  record.isCorrected = true;
  record.correctionRequestId = cr._id;
  record.markedBy = req.user.role;
  record.markedByUser = req.user._id;

  record.auditLog.push({
    action: 'correction_approved',
    actorId: req.user._id,
    actorRole: req.user.role,
    oldValue: oldStatus,
    newValue: newStatus,
    reason: remark || cr.reason,
    timestamp: new Date()
  });

  await record.save();
  return ApiResponse.success(res, 200, 'Correction approved', { record });
});

exports.rejectCorrection = asyncHandler(async (req, res, next) => {
  const cr = await CorrectionRequest.findById(req.params.id);
  if (!cr) return next(new AppError('Not found', 404));

  const { remark } = req.body;
  if (!remark) return next(new AppError('Remark required for rejection', 400));

  cr.status = 'Rejected';
  cr.reviewedBy = req.user._id;
  cr.reviewRemark = remark;
  cr.resolvedAt = new Date();
  await cr.save();

  return ApiResponse.success(res, 200, 'Correction rejected', { request: cr });
});

// --- MANAGEMENT (MENTOR / ADMIN) ---

exports.overrideAttendance = asyncHandler(async (req, res, next) => {
  const { studentId, date, newStatus, reason, inTime, outTime } = req.body;
  if (!reason) return next(new AppError('Reason is mandatory for override', 400));

  const targetDate = new Date(date);
  targetDate.setUTCHours(0,0,0,0);

  let record = await Attendance.findOne({ student: studentId, date: targetDate });
  if (!record) record = new Attendance({ student: studentId, date: targetDate });

  const oldStatus = record.status;
  record.status = newStatus;
  if (inTime) record.inTime = new Date(inTime);
  if (outTime) record.outTime = new Date(outTime);
  record.markedBy = req.user.role;
  record.markedByUser = req.user._id;

  record.auditLog.push({
    action: 'override',
    actorId: req.user._id,
    actorRole: req.user.role,
    oldValue: oldStatus,
    newValue: newStatus,
    reason,
    timestamp: new Date()
  });

  await record.save();
  return ApiResponse.success(res, 200, 'Overridden', { record });
});

// Ported over old methods needed for compatibility (with minor tweaks)
exports.myAttendance = asyncHandler(async (req, res) => {
  const records = await Attendance.find({ student: req.user._id }).sort('-date');
  return ApiResponse.success(res, 200, 'My attendance', { records });
});

exports.attendanceOverview = asyncHandler(async (req, res) => {
  const records = await Attendance.find().populate('student batch').sort('-date').limit(100);
  return ApiResponse.success(res, 200, 'Overview', { records });
});

exports.getBatchAttendance = asyncHandler(async (req, res) => {
  const records = await Attendance.find({ batch: req.params.batchId }).populate('student').sort('-date');
  return ApiResponse.success(res, 200, 'Batch attendance', { records });
});

exports.getStudentAttendance = asyncHandler(async (req, res) => {
  const records = await Attendance.find({ student: req.params.studentId }).sort('-date');
  return ApiResponse.success(res, 200, 'Student attendance', { records });
});

exports.bulkMarkAttendance = asyncHandler(async (req, res, next) => {
  return next(new AppError('Use override endpoint for new Time & Attendance module', 400));
});
