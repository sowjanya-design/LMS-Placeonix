const CodingChallenge = require('../models/CodingChallenge');
const CodingSubmission = require('../models/CodingSubmission');
const Batch = require('../models/Batch');
const Enrollment = require('../models/Enrollment');
const AppError = require('../utils/AppError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { executeCode, LANGUAGES } = require('../services/codeExecutionService');

const assertTeachesBatch = async (batchId, req, next) => {
  if (req.user.role !== 'mentor') return true;
  const batch = await Batch.findById(batchId).select('mentor');
  if (!batch || String(batch.mentor) !== String(req.user._id)) {
    next(new AppError('Forbidden — you can only manage challenges for your own batches', 403));
    return false;
  }
  return true;
};

// @desc   List supported languages
// @route  GET /api/v1/coding-challenges/languages
exports.listLanguages = asyncHandler(async (req, res) => {
  const languages = Object.entries(LANGUAGES).map(([code, l]) => ({ code, label: l.label }));
  return ApiResponse.success(res, 200, 'Languages fetched', { languages });
});

// @desc   List challenges (role-aware)
// @route  GET /api/v1/coding-challenges
exports.listChallenges = asyncHandler(async (req, res) => {
  const { batch, course, status, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (batch) filter.batch = batch;
  if (course) filter.course = course;
  if (status) filter.status = status;

  if (req.user.role === 'student') {
    const enrollments = await Enrollment.find({ student: req.user._id }).select('batch');
    filter.batch = { $in: enrollments.map((e) => e.batch) };
    filter.status = 'published';
  }
  if (req.user.role === 'mentor') {
    const myBatches = await Batch.find({ mentor: req.user._id }).select('_id');
    filter.batch = { $in: myBatches.map((b) => b._id) };
  }

  const total = await CodingChallenge.countDocuments(filter);
  const challenges = await CodingChallenge.find(filter)
    .select('-testCases.expectedOutput')
    .populate('course', 'title')
    .populate('batch', 'name code')
    .populate('createdBy', 'firstName lastName')
    .sort('-createdAt')
    .skip((page - 1) * limit)
    .limit(Number(limit));

  return ApiResponse.paginated(res, 'Challenges fetched', challenges, page, limit, total);
});

// @desc   Get challenge (expected output on hidden test cases stripped for students)
// @route  GET /api/v1/coding-challenges/:id
exports.getChallenge = asyncHandler(async (req, res, next) => {
  const challenge = await CodingChallenge.findById(req.params.id).populate('course batch createdBy');
  if (!challenge) return next(new AppError('Challenge not found', 404));

  if (req.user.role === 'student') {
    return ApiResponse.success(res, 200, 'Challenge fetched', { challenge: challenge.toStudentView() });
  }
  return ApiResponse.success(res, 200, 'Challenge fetched', { challenge });
});

// @desc   Create challenge (mentor or admin)
// @route  POST /api/v1/coding-challenges
exports.createChallenge = asyncHandler(async (req, res, next) => {
  if (!(await assertTeachesBatch(req.body.batch, req, next))) return;
  const challenge = await CodingChallenge.create({ ...req.body, createdBy: req.user._id });
  return ApiResponse.created(res, 'Challenge created', { challenge });
});

// @desc   Update challenge
// @route  PATCH /api/v1/coding-challenges/:id
exports.updateChallenge = asyncHandler(async (req, res, next) => {
  const challenge = await CodingChallenge.findById(req.params.id);
  if (!challenge) return next(new AppError('Challenge not found', 404));
  if (!(await assertTeachesBatch(challenge.batch, req, next))) return;

  const { title, description, allowedLanguages, starterCode, testCases, maxAttempts, status } = req.body;
  const updates = { title, description, allowedLanguages, starterCode, testCases, maxAttempts, status };
  Object.keys(updates).forEach((k) => updates[k] === undefined && delete updates[k]);
  Object.assign(challenge, updates);
  await challenge.save();

  return ApiResponse.success(res, 200, 'Challenge updated', { challenge });
});

// @desc   Delete challenge
// @route  DELETE /api/v1/coding-challenges/:id
exports.deleteChallenge = asyncHandler(async (req, res, next) => {
  const challenge = await CodingChallenge.findById(req.params.id);
  if (!challenge) return next(new AppError('Challenge not found', 404));
  if (!(await assertTeachesBatch(challenge.batch, req, next))) return;

  await challenge.deleteOne();
  await CodingSubmission.deleteMany({ challenge: challenge._id });
  return ApiResponse.success(res, 200, 'Challenge deleted');
});

// @desc   Manual test run — arbitrary stdin, NOT graded, NOT persisted.
//         Rate-limited hard at the route level: this is the endpoint that
//         actually spends external-executor quota per keystroke-adjacent use.
// @route  POST /api/v1/coding-challenges/:id/run
exports.runCode = asyncHandler(async (req, res, next) => {
  const challenge = await CodingChallenge.findById(req.params.id).select('batch allowedLanguages status');
  if (!challenge) return next(new AppError('Challenge not found', 404));

  const enrolled = await Enrollment.findOne({ student: req.user._id, batch: challenge.batch });
  if (!enrolled) return next(new AppError('You are not enrolled in this batch', 403));

  const { language, code, stdin } = req.body;
  if (!challenge.allowedLanguages.includes(language)) {
    return next(new AppError(`Language must be one of: ${challenge.allowedLanguages.join(', ')}`, 400));
  }

  const result = await executeCode({ language, code, stdin });
  return ApiResponse.success(res, 200, 'Run complete', result);
});

// @desc   Submit — runs code against every test case (visible + hidden),
//         grades server-side, persists a CodingSubmission. Hidden test cases'
//         actual stdout/stderr and expected output are never returned.
// @route  POST /api/v1/coding-challenges/:id/submit
exports.submitCode = asyncHandler(async (req, res, next) => {
  const challenge = await CodingChallenge.findById(req.params.id);
  if (!challenge) return next(new AppError('Challenge not found', 404));

  const enrolled = await Enrollment.findOne({ student: req.user._id, batch: challenge.batch });
  if (!enrolled) return next(new AppError('You are not enrolled in this batch', 403));
  if (challenge.status !== 'published') return next(new AppError('This challenge is not currently open', 400));

  const { language, code } = req.body;
  if (!challenge.allowedLanguages.includes(language)) {
    return next(new AppError(`Language must be one of: ${challenge.allowedLanguages.join(', ')}`, 400));
  }

  const existingAttempts = await CodingSubmission.countDocuments({ challenge: challenge._id, student: req.user._id });
  if (existingAttempts >= challenge.maxAttempts) {
    return next(new AppError(`Maximum attempts (${challenge.maxAttempts}) already used`, 400));
  }

  // Sequential, not parallel — bounds concurrent load on the external executor
  // per submission. With the 20-test-case cap this stays within a reasonable
  // request latency; revisit if challenges regularly need more test cases.
  const results = [];
  let score = 0;
  let hadError = false;
  for (const tc of challenge.testCases) {
    let run;
    try {
      run = await executeCode({ language, code, stdin: tc.input });
    } catch (err) {
      hadError = true;
      run = { stdout: '', stderr: err.message, exitCode: 1, timedOut: false };
    }
    const passed = !hadError && run.stdout.trim() === tc.expectedOutput.trim();
    const pointsAwarded = passed ? tc.points : 0;
    score += pointsAwarded;
    results.push({
      testCase: tc._id,
      isHidden: tc.isHidden,
      passed,
      pointsAwarded,
      // Never leak hidden test cases' actual program output — that's enough
      // signal to reverse-engineer the expected answer over repeated attempts.
      stdout: tc.isHidden ? undefined : run.stdout,
      stderr: tc.isHidden ? undefined : run.stderr,
    });
  }

  const maxScore = challenge.maxScore;
  const percentage = maxScore > 0 ? Math.round((score / maxScore) * 10000) / 100 : 0;

  const submission = await CodingSubmission.create({
    challenge: challenge._id,
    student: req.user._id,
    batch: challenge.batch,
    language,
    code,
    attemptNumber: existingAttempts + 1,
    results,
    score,
    maxScore,
    percentage,
    passed: percentage === 100,
    status: hadError ? 'error' : 'graded',
  });

  return ApiResponse.created(res, 'Submission graded', { submission });
});

// @desc   My submissions for a challenge (student)
// @route  GET /api/v1/coding-challenges/:id/submissions/me
exports.mySubmissions = asyncHandler(async (req, res) => {
  const submissions = await CodingSubmission.find({ challenge: req.params.id, student: req.user._id }).sort('attemptNumber');
  return ApiResponse.success(res, 200, 'Your submissions fetched', { submissions });
});

// @desc   All students' submissions for a challenge (mentor/admin)
// @route  GET /api/v1/coding-challenges/:id/submissions
exports.listSubmissions = asyncHandler(async (req, res, next) => {
  const challenge = await CodingChallenge.findById(req.params.id).select('batch');
  if (!challenge) return next(new AppError('Challenge not found', 404));
  if (!(await assertTeachesBatch(challenge.batch, req, next))) return;

  const submissions = await CodingSubmission.find({ challenge: req.params.id })
    .populate('student', 'firstName lastName email')
    .sort('-percentage');
  return ApiResponse.success(res, 200, 'Submissions fetched', { submissions });
});
