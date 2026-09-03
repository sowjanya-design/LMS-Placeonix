const MockInterview = require("../models/MockInterview");
const AppError = require("../utils/AppError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");

// @desc   List mock interviews (role-aware)
// @route  GET /api/v1/mock-interviews
exports.listMocks = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.user.role === "student") {
    filter.student = req.user._id;
  } else if (req.user.role === "mentor") {
    // Mentors see mocks they conduct AND mocks for any student in their batches
    // (so admin-scheduled mocks for their students show up too).
    const Batch = require("../models/Batch");
    const Enrollment = require("../models/Enrollment");
    const myBatches = await Batch.find({ mentor: req.user._id }).select("_id");
    const enrolls = await Enrollment.find({
      batch: { $in: myBatches.map((b) => b._id) },
    }).select("student");
    const studentIds = enrolls.map((e) => e.student);
    filter.$or = [
      { interviewer: req.user._id },
      { student: { $in: studentIds } },
    ];
  }
  // Only staff may filter by an arbitrary student id — a student's own
  // scope above must never be overridable via query param.
  if (req.query.student && req.user.role !== "student")
    filter.student = req.query.student;

  const mocks = await MockInterview.find(filter)
    .populate("student", "firstName lastName email studentProfile.enrollmentId")
    .populate("interviewer", "firstName lastName")
    .sort("-scheduledAt");
  return ApiResponse.success(res, 200, "Mock interviews fetched", mocks);
});

// @desc   Schedule a mock interview (admin/mentor)
// @route  POST /api/v1/mock-interviews
exports.createMock = asyncHandler(async (req, res) => {
  const body = { ...req.body, createdBy: req.user._id };
  if (!body.interviewer && req.user.role === "mentor")
    body.interviewer = req.user._id;
  const mock = await MockInterview.create(body);

  try {
    const Notification = require("../models/Notification");
    await Notification.notify({
      recipient: mock.student,
      type: "system",
      title: "Mock interview scheduled",
      message: `${mock.title} on ${new Date(mock.scheduledAt).toDateString()}.`,
      sender: req.user._id,
    });
  } catch (e) {
    /* best-effort */
  }

  return ApiResponse.created(res, "Mock interview scheduled", { mock });
});

// @desc   Update / record feedback (admin/mentor)
// @route  PATCH /api/v1/mock-interviews/:id
exports.updateMock = asyncHandler(async (req, res, next) => {
  const mock = await MockInterview.findById(req.params.id);
  if (!mock) return next(new AppError("Mock interview not found", 404));
  if (
    req.user.role === "mentor" &&
    String(mock.interviewer) !== String(req.user._id)
  ) {
    return next(
      new AppError(
        "Forbidden — you can only edit mock interviews you conduct",
        403,
      ),
    );
  }
  const wasCompleted = mock.status === "completed";

  // Whitelisted — never let the request body touch `student`, `interviewer`,
  // or `createdBy` directly. A mentor is only authorized to edit interviews
  // they conduct, and an unfiltered Object.assign would let them silently
  // reassign the record to a different student (or a different interviewer)
  // instead of just recording feedback on their own scheduled interview.
  const {
    title,
    role,
    company,
    type,
    scheduledAt,
    mode,
    meetingLink,
    status,
    rounds,
    overallScore,
    strengths,
    improvements,
    notes,
  } = req.body;
  const updates = {
    title,
    role,
    company,
    type,
    scheduledAt,
    mode,
    meetingLink,
    status,
    rounds,
    overallScore,
    strengths,
    improvements,
    notes,
  };
  Object.keys(updates).forEach(
    (k) => updates[k] === undefined && delete updates[k],
  );
  Object.assign(mock, updates);

  // Auto-average overallScore from rounds if rounds provided and no explicit overall.
  if (
    req.body.rounds &&
    req.body.rounds.length &&
    req.body.overallScore == null
  ) {
    const scored = req.body.rounds.filter((r) => r.score != null);
    if (scored.length)
      mock.overallScore = Math.round(
        scored.reduce((s, r) => s + r.score, 0) / scored.length,
      );
  }
  await mock.save();

  if (!wasCompleted && mock.status === "completed") {
    try {
      const Notification = require("../models/Notification");
      await Notification.notify({
        recipient: mock.student,
        type: "system",
        title: "Mock interview feedback ready",
        message: `Feedback for "${mock.title}"${mock.overallScore != null ? ` — scored ${mock.overallScore}/100` : ""}.`,
        sender: req.user._id,
      });
    } catch (e) {
      /* best-effort */
    }
  }

  return ApiResponse.success(res, 200, "Mock interview updated", { mock });
});

// @desc   Delete a mock interview (admin/mentor)
// @route  DELETE /api/v1/mock-interviews/:id
exports.deleteMock = asyncHandler(async (req, res, next) => {
  const mock = await MockInterview.findById(req.params.id);
  if (!mock) return next(new AppError("Mock interview not found", 404));
  if (
    req.user.role === "mentor" &&
    String(mock.interviewer) !== String(req.user._id)
  ) {
    return next(
      new AppError(
        "Forbidden — you can only delete mock interviews you conduct",
        403,
      ),
    );
  }
  await mock.deleteOne();
  return ApiResponse.success(res, 200, "Mock interview removed");
});
