const Quiz = require("../models/Quiz");
const QuizResult = require("../models/QuizResult");
const Batch = require("../models/Batch");
const Enrollment = require("../models/Enrollment");
const AppError = require("../utils/AppError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");

// A mentor may only manage quizzes for a batch they teach; admins bypass.
const assertTeachesBatch = async (batchId, req, next) => {
  if (req.user.role !== "mentor") return true;
  const batch = await Batch.findById(batchId).select("mentor");
  if (!batch || String(batch.mentor) !== String(req.user._id)) {
    next(
      new AppError(
        "Forbidden — you can only manage quizzes for your own batches",
        403,
      ),
    );
    return false;
  }
  return true;
};

// @desc   List quizzes (role-aware)
// @route  GET /api/v1/quizzes
exports.listQuizzes = asyncHandler(async (req, res) => {
  const { batch, course, status, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (batch) filter.batch = batch;
  if (course) filter.course = course;
  if (status) filter.status = status;

  if (req.user.role === "student") {
    const enrollments = await Enrollment.find({
      student: req.user._id,
      status: { $ne: "dropped" },
    }).select("batch");
    filter.batch = { $in: enrollments.map((e) => e.batch) };
    filter.status = "published"; // students never see drafts/closed quizzes in listings
  }
  if (req.user.role === "mentor") {
    const myBatches = await Batch.find({ mentor: req.user._id }).select("_id");
    filter.batch = { $in: myBatches.map((b) => b._id) };
  }

  const total = await Quiz.countDocuments(filter);
  const quizzes = await Quiz.find(filter)
    .select("-questions.options.isCorrect")
    .populate("course", "title")
    .populate("batch", "name code")
    .populate("createdBy", "firstName lastName")
    .sort("-createdAt")
    .skip((page - 1) * limit)
    .limit(Number(limit));

  return ApiResponse.paginated(
    res,
    "Quizzes fetched",
    quizzes,
    page,
    limit,
    total,
  );
});

// @desc   Get quiz (correct answers stripped for students)
// @route  GET /api/v1/quizzes/:id
exports.getQuiz = asyncHandler(async (req, res, next) => {
  const quiz = await Quiz.findById(req.params.id).populate(
    "course batch createdBy",
  );
  if (!quiz) return next(new AppError("Quiz not found", 404));

  if (req.user.role === "student") {
    return ApiResponse.success(res, 200, "Quiz fetched", {
      quiz: quiz.toStudentView(),
    });
  }
  return ApiResponse.success(res, 200, "Quiz fetched", { quiz });
});

// @desc   Create quiz (mentor or admin)
// @route  POST /api/v1/quizzes
exports.createQuiz = asyncHandler(async (req, res, next) => {
  if (!(await assertTeachesBatch(req.body.batch, req, next))) return;
  const quiz = await Quiz.create({ ...req.body, createdBy: req.user._id });
  return ApiResponse.created(res, "Quiz created", { quiz });
});

// @desc   Update quiz
// @route  PATCH /api/v1/quizzes/:id
exports.updateQuiz = asyncHandler(async (req, res, next) => {
  const quiz = await Quiz.findById(req.params.id);
  if (!quiz) return next(new AppError("Quiz not found", 404));
  if (!(await assertTeachesBatch(quiz.batch, req, next))) return;

  const {
    title,
    description,
    questions,
    timeLimitMinutes,
    maxAttempts,
    passingScorePercent,
    availableFrom,
    availableUntil,
    status,
  } = req.body;
  const updates = {
    title,
    description,
    questions,
    timeLimitMinutes,
    maxAttempts,
    passingScorePercent,
    availableFrom,
    availableUntil,
    status,
  };
  Object.keys(updates).forEach(
    (k) => updates[k] === undefined && delete updates[k],
  );
  Object.assign(quiz, updates);
  await quiz.save();

  return ApiResponse.success(res, 200, "Quiz updated", { quiz });
});

// @desc   Delete quiz
// @route  DELETE /api/v1/quizzes/:id
exports.deleteQuiz = asyncHandler(async (req, res, next) => {
  const quiz = await Quiz.findById(req.params.id);
  if (!quiz) return next(new AppError("Quiz not found", 404));
  if (!(await assertTeachesBatch(quiz.batch, req, next))) return;

  await quiz.deleteOne();
  await QuizResult.deleteMany({ quiz: quiz._id });
  return ApiResponse.success(res, 200, "Quiz deleted");
});

// @desc   Start a new attempt (student)
// @route  POST /api/v1/quizzes/:id/attempts
exports.startAttempt = asyncHandler(async (req, res, next) => {
  const quiz = await Quiz.findById(req.params.id);
  if (!quiz) return next(new AppError("Quiz not found", 404));

  const enrolled = await Enrollment.findOne({
    student: req.user._id,
    batch: quiz.batch,
  });
  if (!enrolled)
    return next(new AppError("You are not enrolled in this batch", 403));
  if (!quiz.isOpen)
    return next(new AppError("This quiz is not currently open", 400));

  const existingAttempts = await QuizResult.countDocuments({
    quiz: quiz._id,
    student: req.user._id,
  });
  if (existingAttempts >= quiz.maxAttempts) {
    return next(
      new AppError(`Maximum attempts (${quiz.maxAttempts}) already used`, 400),
    );
  }
  const inProgress = await QuizResult.findOne({
    quiz: quiz._id,
    student: req.user._id,
    status: "in_progress",
  });
  if (inProgress) {
    return ApiResponse.success(res, 200, "Resuming in-progress attempt", {
      attempt: inProgress,
      quiz: quiz.toStudentView(),
    });
  }

  const attempt = await QuizResult.create({
    quiz: quiz._id,
    student: req.user._id,
    batch: quiz.batch,
    attemptNumber: existingAttempts + 1,
    maxScore: quiz.maxScore,
  });

  return ApiResponse.created(res, "Attempt started", {
    attempt,
    quiz: quiz.toStudentView(),
  });
});

// @desc   Submit an attempt — grading happens server-side against the stored
//         correct options; client-submitted "correctness" is never trusted.
// @route  POST /api/v1/quizzes/:id/attempts/:attemptId/submit
exports.submitAttempt = asyncHandler(async (req, res, next) => {
  const quiz = await Quiz.findById(req.params.id);
  if (!quiz) return next(new AppError("Quiz not found", 404));

  const attempt = await QuizResult.findById(req.params.attemptId);
  if (!attempt) return next(new AppError("Attempt not found", 404));
  if (String(attempt.student) !== String(req.user._id)) {
    return next(new AppError("Not authorized", 403));
  }
  if (attempt.status === "submitted") {
    return next(new AppError("This attempt was already submitted", 400));
  }

  const submitted = req.body.answers || []; // [{ question, selectedOptions: [optionId,...] }]
  const answerByQuestion = new Map(
    submitted.map((a) => [String(a.question), a.selectedOptions || []]),
  );

  let score = 0;
  const gradedAnswers = quiz.questions.map((q) => {
    const selected = (answerByQuestion.get(String(q._id)) || []).map(String);
    const correctIds = q.options
      .filter((o) => o.isCorrect)
      .map((o) => String(o._id));
    const isCorrect =
      selected.length === correctIds.length &&
      correctIds.every((id) => selected.includes(id));
    const pointsAwarded = isCorrect ? q.points : 0;
    score += pointsAwarded;
    return {
      question: q._id,
      selectedOptions: selected,
      isCorrect,
      pointsAwarded,
    };
  });

  const maxScore = quiz.maxScore;
  const percentage =
    maxScore > 0 ? Math.round((score / maxScore) * 10000) / 100 : 0;

  attempt.answers = gradedAnswers;
  attempt.score = score;
  attempt.maxScore = maxScore;
  attempt.percentage = percentage;
  attempt.passed = percentage >= quiz.passingScorePercent;
  attempt.status = "submitted";
  attempt.submittedAt = new Date();
  await attempt.save();

  return ApiResponse.success(res, 200, "Quiz submitted", { attempt });
});

// @desc   My attempts for a quiz (student) — includes correct answers since
//         these are already-submitted attempts, safe to reveal for review.
// @route  GET /api/v1/quizzes/:id/results/me
exports.myResults = asyncHandler(async (req, res) => {
  const results = await QuizResult.find({
    quiz: req.params.id,
    student: req.user._id,
  }).sort("attemptNumber");
  return ApiResponse.success(res, 200, "Your results fetched", { results });
});

// @desc   All students' results for a quiz (mentor/admin)
// @route  GET /api/v1/quizzes/:id/results
exports.listResults = asyncHandler(async (req, res, next) => {
  const quiz = await Quiz.findById(req.params.id).select("batch");
  if (!quiz) return next(new AppError("Quiz not found", 404));
  if (!(await assertTeachesBatch(quiz.batch, req, next))) return;

  const results = await QuizResult.find({ quiz: req.params.id })
    .populate("student", "firstName lastName email")
    .sort("-percentage");
  return ApiResponse.success(res, 200, "Results fetched", { results });
});
