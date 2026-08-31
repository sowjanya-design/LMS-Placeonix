const Batch = require('../models/Batch');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const logger = require('../utils/logger');
const { MAX_BATCH_SIZE } = require('../config/constants');

// @desc   List batches
// @route  GET /api/v1/batches
exports.listBatches = asyncHandler(async (req, res) => {
  const { status, course, mentor, page = 1, limit = 20, sort = '-startDate' } = req.query;

  const filter = {};
  if (status) filter.status = status;
  if (course) filter.course = course;
  if (mentor) filter.mentor = mentor;

  // Mentors only see their own batches
  if (req.user.role === 'mentor') filter.mentor = req.user._id;

  const total = await Batch.countDocuments(filter);
  const batches = await Batch.find(filter)
    .populate('course', 'title category color duration')
    .populate('mentor', 'firstName lastName avatar')
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(Number(limit));

  // Real enrolled count per batch (stored enrolledCount can be stale on seeded data).
  const counts = await Enrollment.aggregate([
    { $match: { batch: { $in: batches.map((b) => b._id) } } },
    { $group: { _id: '$batch', n: { $sum: 1 } } },
  ]);
  const countMap = {};
  counts.forEach((c) => { countMap[String(c._id)] = c.n; });
  const withCounts = batches.map((b) => {
    const obj = b.toObject();
    obj.enrolledCount = countMap[String(b._id)] || 0;
    return obj;
  });

  return ApiResponse.paginated(res, 'Batches fetched', withCounts, page, limit, total);
});

// @desc   Get batch with students
// @route  GET /api/v1/batches/:id
exports.getBatch = asyncHandler(async (req, res, next) => {
  const batch = await Batch.findById(req.params.id)
    .populate('course')
    .populate('mentor', 'firstName lastName email avatar mentorProfile')
    .populate('coMentors', 'firstName lastName avatar');

  if (!batch) return next(new AppError('Batch not found', 404));

  const enrollments = await Enrollment.find({ batch: batch._id })
    .populate('student', 'firstName lastName email avatar studentProfile.enrollmentId');

  return ApiResponse.success(res, 200, 'Batch fetched', {
    batch,
    enrollments,
    studentCount: enrollments.length,
  });
});

// @desc   Create batch
// @route  POST /api/v1/batches
exports.createBatch = asyncHandler(async (req, res, next) => {
  const course = await Course.findById(req.body.course);
  if (!course) return next(new AppError('Course not found', 404));

  const mentor = await User.findOne({ _id: req.body.mentor, role: 'mentor' });
  if (!mentor) return next(new AppError('Invalid mentor', 400));

  if (req.body.capacity > MAX_BATCH_SIZE) {
    return next(new AppError(`Maximum capacity is ${MAX_BATCH_SIZE}`, 400));
  }

  const batch = await Batch.create({ ...req.body, createdBy: req.user._id });
  return ApiResponse.created(res, 'Batch created', { batch });
});

// @desc   Update batch
// @route  PATCH /api/v1/batches/:id
exports.updateBatch = asyncHandler(async (req, res, next) => {
  // createdBy/enrolledCount are managed by the system (enroll/unenroll,
  // creation) — never client-settable through the general update route.
  const {
    name, code, capacity, startDate, endDate, schedule, mode, venue, meetingLink,
    status, course, mentor, coMentors, description, notes,
  } = req.body;
  if (capacity !== undefined && capacity > MAX_BATCH_SIZE) {
    return next(new AppError(`Maximum capacity is ${MAX_BATCH_SIZE}`, 400));
  }
  const updates = {
    name, code, capacity, startDate, endDate, schedule, mode, venue, meetingLink,
    status, course, mentor, coMentors, description, notes,
  };
  Object.keys(updates).forEach((k) => updates[k] === undefined && delete updates[k]);
  updates.updatedBy = req.user._id;

  const batch = await Batch.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
  if (!batch) return next(new AppError('Batch not found', 404));
  return ApiResponse.success(res, 200, 'Batch updated', { batch });
});

// @desc   Delete batch
// @route  DELETE /api/v1/batches/:id
exports.deleteBatch = asyncHandler(async (req, res, next) => {
  const batch = await Batch.findById(req.params.id);
  if (!batch) return next(new AppError('Batch not found', 404));

  const enrollmentCount = await Enrollment.countDocuments({ batch: batch._id });
  if (enrollmentCount > 0) {
    return next(new AppError('Cannot delete batch with active enrollments', 400));
  }

  await batch.deleteOne();
  return ApiResponse.success(res, 200, 'Batch deleted');
});

// @desc   Enroll student to batch
// @route  POST /api/v1/batches/:id/enroll
exports.enrollStudent = asyncHandler(async (req, res, next) => {
  const { studentId, fee } = req.body;
  const batchDoc = await Batch.findById(req.params.id).populate('course');
  if (!batchDoc) return next(new AppError('Batch not found', 404));

  const student = await User.findOne({ _id: studentId, role: 'student' });
  if (!student) return next(new AppError('Student not found', 404));

  const existing = await Enrollment.findOne({ student: studentId, batch: batchDoc._id });
  if (existing) return next(new AppError('Already enrolled in this batch', 409));

  // Atomically claim a seat: the capacity check and the increment happen in
  // one findOneAndUpdate, so two concurrent requests can't both pass a
  // separate check-then-save and overfill the batch past its stated cap.
  const batch = await Batch.findOneAndUpdate(
    { _id: req.params.id, $expr: { $lt: ['$enrolledCount', '$capacity'] } },
    { $inc: { enrolledCount: 1 } },
    { new: true }
  );
  if (!batch) return next(new AppError('Batch is full', 400));

  const totalFee = fee || batchDoc.course.fee?.amount || 0;

  let enrollment;
  try {
    enrollment = await Enrollment.create({
      student: studentId,
      batch: batch._id,
      course: batchDoc.course._id,
      fee: { total: totalFee, paid: 0, due: totalFee },
    });
  } catch (err) {
    // Roll back the seat claim if enrollment creation fails for any reason.
    await Batch.findByIdAndUpdate(batch._id, { $inc: { enrolledCount: -1 } });
    throw err;
  }

  await Course.findByIdAndUpdate(batchDoc.course._id, { $inc: { enrollmentCount: 1 } });

  // Best-effort — sendEnrollmentEmail was built but never actually called
  // from anywhere; this is its one real trigger point.
  try {
    const { sendEnrollmentEmail } = require('../services/emailService');
    await sendEnrollmentEmail(student, batchDoc.course, batch);
  } catch (err) {
    logger.error(`Enrollment email failed for ${student.email}: ${err.message}`);
  }

  return ApiResponse.created(res, 'Student enrolled', { enrollment });
});

// @desc   Unenroll student
// @route  DELETE /api/v1/batches/:id/enroll/:studentId
exports.unenrollStudent = asyncHandler(async (req, res, next) => {
  const enrollment = await Enrollment.findOne({
    batch: req.params.id,
    student: req.params.studentId,
  });
  if (!enrollment) return next(new AppError('Enrollment not found', 404));

  await enrollment.deleteOne();
  await Batch.findByIdAndUpdate(req.params.id, { $inc: { enrolledCount: -1 } });

  return ApiResponse.success(res, 200, 'Student unenrolled');
});

// @desc   Email every student currently enrolled in a batch
// @route  POST /api/v1/batches/:id/bulk-email
exports.bulkEmail = asyncHandler(async (req, res, next) => {
  const { subject, body } = req.body;
  const batch = await Batch.findById(req.params.id);
  if (!batch) return next(new AppError('Batch not found', 404));

  const enrollments = await Enrollment.find({ batch: batch._id }).populate('student', 'firstName email');
  const recipients = enrollments.filter((e) => e.student?.email);
  if (recipients.length === 0) {
    return next(new AppError('This batch has no enrolled students with an email on file', 400));
  }

  const { sendEmail, baseTemplate } = require('../services/emailService');
  let sent = 0;
  const failed = [];
  for (const e of recipients) {
    try {
      await sendEmail({
        to: e.student.email,
        subject,
        html: baseTemplate(subject, `<p>Hi ${e.student.firstName || ''},</p>${body}`),
      });
      sent += 1;
    } catch (err) {
      logger.error(`Bulk email to ${e.student.email} failed: ${err.message}`);
      failed.push(e.student.email);
    }
  }

  return ApiResponse.success(res, 200, `Sent to ${sent} of ${recipients.length} students`, { sent, total: recipients.length, failed });
});
