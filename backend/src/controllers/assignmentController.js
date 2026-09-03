const Assignment = require("../models/Assignment");
const Batch = require("../models/Batch");
const Enrollment = require("../models/Enrollment");
const Notification = require("../models/Notification");
const AppError = require("../utils/AppError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");

// @desc   List assignments (role-aware)
// @route  GET /api/v1/assignments
exports.listAssignments = asyncHandler(async (req, res) => {
  const { batch, course, status, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (batch) filter.batch = batch;
  if (course) filter.course = course;
  if (status) filter.status = status;

  // Students only see assignments for their batches
  if (req.user.role === "student") {
    const enrollments = await Enrollment.find({
      student: req.user._id,
      status: { $ne: "dropped" },
    }).select("batch");
    filter.batch = { $in: enrollments.map((e) => e.batch) };
  }
  // Mentors only see assignments for their batches
  if (req.user.role === "mentor") {
    const myBatches = await Batch.find({ mentor: req.user._id }).select("_id");
    filter.batch = { $in: myBatches.map((b) => b._id) };
  }

  const total = await Assignment.countDocuments(filter);
  const assignments = await Assignment.find(filter)
    .populate("course", "title")
    .populate("batch", "name code")
    .populate("createdBy", "firstName lastName")
    .sort("-dueDate")
    .skip((page - 1) * limit)
    .limit(Number(limit));

  // Same masking as getAssignment: a student must only ever see their own
  // submission, never classmates' — the raw docs above carry every
  // submission in the batch (content, files, mentor feedback, scores).
  const data =
    req.user.role === "student"
      ? assignments.map((a) => {
          const obj = a.toObject();
          const mine = obj.submissions.find(
            (s) => String(s.student) === String(req.user._id),
          );
          obj.submissions = mine ? [mine] : [];
          return obj;
        })
      : assignments;

  return ApiResponse.paginated(
    res,
    "Assignments fetched",
    data,
    page,
    limit,
    total,
  );
});

// @desc   Get assignment
// @route  GET /api/v1/assignments/:id
exports.getAssignment = asyncHandler(async (req, res, next) => {
  const assignment = await Assignment.findById(req.params.id)
    .populate("course batch createdBy")
    .populate("submissions.student", "firstName lastName avatar");

  if (!assignment) return next(new AppError("Assignment not found", 404));

  // Students only see their own submission
  if (req.user.role === "student") {
    const mySubmission = assignment.submissions.find(
      (s) => String(s.student._id) === String(req.user._id),
    );
    const data = assignment.toObject();
    data.submissions = mySubmission ? [mySubmission] : [];
    return ApiResponse.success(res, 200, "Assignment fetched", {
      assignment: data,
    });
  }

  return ApiResponse.success(res, 200, "Assignment fetched", { assignment });
});

// @desc   Create assignment (mentor or admin)
// @route  POST /api/v1/assignments
exports.createAssignment = asyncHandler(async (req, res) => {
  const assignment = await Assignment.create({
    ...req.body,
    createdBy: req.user._id,
  });
  return ApiResponse.created(res, "Assignment created", { assignment });
});

// A mentor may only mutate assignments for a batch they teach; admins bypass.
const assertTeachesBatch = async (batchId, req, next) => {
  if (req.user.role !== "mentor") return true;
  const batch = await Batch.findById(batchId).select("mentor");
  if (!batch || String(batch.mentor) !== String(req.user._id)) {
    next(
      new AppError(
        "Forbidden — you can only manage assignments for your own batches",
        403,
      ),
    );
    return false;
  }
  return true;
};

// @desc   Update assignment
// @route  PATCH /api/v1/assignments/:id
exports.updateAssignment = asyncHandler(async (req, res, next) => {
  const assignment = await Assignment.findById(req.params.id);
  if (!assignment) return next(new AppError("Assignment not found", 404));
  if (!(await assertTeachesBatch(assignment.batch, req, next))) return;

  const {
    title,
    description,
    dueDate,
    maxScore,
    instructions,
    attachments,
    status,
    type,
    difficulty,
    referenceLinks,
  } = req.body;
  const updates = {
    title,
    description,
    dueDate,
    maxScore,
    instructions,
    attachments,
    status,
    type,
    difficulty,
    referenceLinks,
  };
  Object.keys(updates).forEach(
    (k) => updates[k] === undefined && delete updates[k],
  );
  Object.assign(assignment, updates);
  await assignment.save();

  return ApiResponse.success(res, 200, "Assignment updated", { assignment });
});

// @desc   Delete assignment
// @route  DELETE /api/v1/assignments/:id
exports.deleteAssignment = asyncHandler(async (req, res, next) => {
  const assignment = await Assignment.findById(req.params.id);
  if (!assignment) return next(new AppError("Assignment not found", 404));
  if (!(await assertTeachesBatch(assignment.batch, req, next))) return;

  await assignment.deleteOne();
  return ApiResponse.success(res, 200, "Assignment deleted");
});

// @desc   Submit assignment (student)
// @route  POST /api/v1/assignments/:id/submit
exports.submitAssignment = asyncHandler(async (req, res, next) => {
  const assignment = await Assignment.findById(req.params.id);
  if (!assignment) return next(new AppError("Assignment not found", 404));

  // Check student is enrolled in batch
  const enrolled = await Enrollment.findOne({
    student: req.user._id,
    batch: assignment.batch,
  });
  if (!enrolled)
    return next(new AppError("You are not enrolled in this batch", 403));

  // Check existing submission
  const existing = assignment.submissions.find(
    (s) => String(s.student) === String(req.user._id),
  );

  const isLate = new Date() > assignment.dueDate;
  const submissionData = {
    student: req.user._id,
    content: req.body.content,
    files: req.body.files || [],
    githubLink: req.body.githubLink,
    status: isLate ? "late" : "submitted",
    submittedAt: new Date(),
  };

  if (existing) {
    Object.assign(existing, submissionData);
  } else {
    assignment.submissions.push(submissionData);
  }
  await assignment.save();

  return ApiResponse.success(
    res,
    200,
    isLate ? "Submitted (late)" : "Submitted successfully",
    {
      submission: assignment.submissions.find(
        (s) => String(s.student) === String(req.user._id),
      ),
    },
  );
});

// @desc   Review submission (mentor/admin)
// @route  POST /api/v1/assignments/:id/submissions/:submissionId/review
exports.reviewSubmission = asyncHandler(async (req, res, next) => {
  const { score, grade, feedback } = req.body;
  const assignment = await Assignment.findById(req.params.id);
  if (!assignment) return next(new AppError("Assignment not found", 404));
  if (!(await assertTeachesBatch(assignment.batch, req, next))) return;

  const maxScore = assignment.maxScore || 100;
  if (
    score != null &&
    (Number.isNaN(Number(score)) || score < 0 || score > maxScore)
  ) {
    return next(new AppError(`score must be between 0 and ${maxScore}`, 400));
  }

  const submission = assignment.submissions.id(req.params.submissionId);
  if (!submission) return next(new AppError("Submission not found", 404));

  submission.score = score;
  submission.grade = grade;
  submission.mentorFeedback = feedback;
  submission.reviewedAt = new Date();
  submission.reviewedBy = req.user._id;
  submission.status = "reviewed";

  await assignment.save();

  // Notify the student that their work was graded.
  try {
    await Notification.notify({
      recipient: submission.student,
      type: "assignment_reviewed",
      title: "Assignment graded",
      message: `Your "${assignment.title}" was graded${score != null ? ` ${score}/${assignment.maxScore || 100}` : ""}.`,
      sender: req.user._id,
      relatedTo: { model: "Assignment", id: assignment._id },
    });
  } catch (e) {
    /* best-effort */
  }

  return ApiResponse.success(res, 200, "Submission reviewed", { submission });
});
