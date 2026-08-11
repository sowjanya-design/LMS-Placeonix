const Payment = require('../models/Payment');
const Enrollment = require('../models/Enrollment');
const AppError = require('../utils/AppError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { auditLog } = require('../utils/audit');

// @desc   Student submits a fee payment for admin verification.
//         No payment gateway is integrated yet — this does NOT move money
//         and must never mark itself 'completed' or touch enrollment.fee,
//         since the amount/method are entirely client-submitted and
//         unverifiable server-side. An admin must confirm the payment via
//         recordPayment (or a future gateway webhook) before it counts.
// @route  POST /api/v1/payments/me/pay
exports.payMyFees = asyncHandler(async (req, res, next) => {
  const { enrollmentId } = req.body;
  let amount = Number(req.body.amount);
  if (!amount || amount <= 0) return next(new AppError('Enter a valid amount', 400));

  // Normalize the UI's method label to the Payment enum (cash/upi/card/bank_transfer/...).
  let method = String(req.body.method || 'upi').toLowerCase().replace(/\s|\//g, '');
  if (method === 'netbanking' || method === 'banktransfer') method = 'bank_transfer';
  if (method === 'creditdebitcard' || method === 'debitcard' || method === 'creditcard') method = 'card';
  if (!['cash', 'upi', 'card', 'bank_transfer', 'razorpay', 'stripe', 'other'].includes(method)) method = 'other';

  let enrollment;
  if (enrollmentId) {
    enrollment = await Enrollment.findOne({ _id: enrollmentId, student: req.user._id });
  } else {
    const enrollments = await Enrollment.find({ student: req.user._id });
    enrollment = enrollments.sort((a, b) => (b.fee.due || 0) - (a.fee.due || 0))[0];
  }
  if (!enrollment) return next(new AppError('No enrollment found to pay for', 404));

  if (enrollment.fee.due != null && amount > enrollment.fee.due) amount = enrollment.fee.due;
  if (amount <= 0) return next(new AppError('No pending dues on this course', 400));

  const payment = await Payment.create({
    enrollment: enrollment._id,
    student: req.user._id,
    amount,
    method,
    notes: 'Self-reported by student — pending admin verification (no payment gateway integrated)',
    status: 'pending',
  });

  return ApiResponse.created(
    res,
    'Payment submitted — pending verification by an administrator. It will not be reflected in your fee balance until confirmed.',
    { payment }
  );
});

// @desc   List payments (admin)
// @route  GET /api/v1/payments
exports.listPayments = asyncHandler(async (req, res) => {
  const { status, method, student, from, to, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (method) filter.method = method;
  if (student) filter.student = student;
  if (from || to) {
    filter.paidOn = {};
    if (from) filter.paidOn.$gte = new Date(from);
    if (to) filter.paidOn.$lte = new Date(to);
  }

  // Students see only their own
  if (req.user.role === 'student') filter.student = req.user._id;

  const total = await Payment.countDocuments(filter);
  const payments = await Payment.find(filter)
    .populate('student', 'firstName lastName email studentProfile.enrollmentId')
    .populate('enrollment')
    .populate('receivedBy', 'firstName lastName')
    .sort('-paidOn')
    .skip((page - 1) * limit)
    .limit(Number(limit));

  return ApiResponse.paginated(res, 'Payments fetched', payments, page, limit, total);
});

// @desc   Get payment / invoice
// @route  GET /api/v1/payments/:id
exports.getPayment = asyncHandler(async (req, res, next) => {
  const payment = await Payment.findById(req.params.id)
    .populate('student enrollment receivedBy');
  if (!payment) return next(new AppError('Payment not found', 404));

  // Students can only see their own
  if (
    req.user.role === 'student' &&
    String(payment.student._id) !== String(req.user._id)
  ) {
    return next(new AppError('Not authorized', 403));
  }

  return ApiResponse.success(res, 200, 'Payment fetched', { payment });
});

// @desc   Record payment (admin)
// @route  POST /api/v1/payments
exports.recordPayment = asyncHandler(async (req, res, next) => {
  const { enrollmentId, amount, method, transactionId, notes } = req.body;

  const enrollment = await Enrollment.findById(enrollmentId);
  if (!enrollment) return next(new AppError('Enrollment not found', 404));

  const payment = await Payment.create({
    enrollment: enrollmentId,
    student: enrollment.student,
    amount,
    method,
    transactionId,
    notes,
    status: 'completed',
    paidOn: new Date(),
    receivedBy: req.user._id,
  });

  // Update enrollment fee record
  enrollment.fee.paid += amount;
  enrollment.fee.due = Math.max(0, enrollment.fee.total - enrollment.fee.paid);
  enrollment.fee.payments.push({
    amount,
    method,
    transactionId,
    paidOn: new Date(),
    notes,
  });
  await enrollment.save();

  auditLog(req, {
    module: 'payments',
    action: 'record_payment',
    resource: 'Payment',
    resourceId: payment._id,
    newValue: { amount, method, enrollmentId, status: 'completed' },
  });

  return ApiResponse.created(res, 'Payment recorded', { payment, enrollment });
});

// @desc   Update payment status (admin) — verifying a student-submitted
//         payment, or correcting notes/transaction reference. This is the
//         only place a 'pending' self-reported payment becomes 'completed'
//         and lands in the enrollment's fee balance — an explicit admin
//         action, audit-logged via receivedBy/notes rather than trusted
//         directly from client input.
// @route  PATCH /api/v1/payments/:id
exports.updatePayment = asyncHandler(async (req, res, next) => {
  const { status, notes, transactionId, reason } = req.body;
  const allowedStatuses = ['pending', 'processing', 'completed', 'failed'];
  if (status !== undefined && !allowedStatuses.includes(status)) {
    return next(new AppError(`status must be one of: ${allowedStatuses.join(', ')}`, 400));
  }

  const payment = await Payment.findById(req.params.id);
  if (!payment) return next(new AppError('Payment not found', 404));

  const wasCompleted = payment.status === 'completed';
  const oldStatus = payment.status;
  if (status !== undefined) payment.status = status;
  if (notes !== undefined) payment.notes = reason ? `${notes} (${reason})` : notes;
  if (transactionId !== undefined) payment.transactionId = transactionId;
  payment.receivedBy = req.user._id;

  // Only apply the enrollment fee balance once, on the transition into
  // 'completed' — amount/method are never editable here, so this can't
  // be used to inflate a balance beyond what was originally submitted.
  if (!wasCompleted && payment.status === 'completed') {
    payment.paidOn = payment.paidOn || new Date();
    const enrollment = await Enrollment.findById(payment.enrollment);
    if (enrollment) {
      enrollment.fee.paid += payment.amount;
      enrollment.fee.due = Math.max(0, enrollment.fee.total - enrollment.fee.paid);
      enrollment.fee.payments.push({
        amount: payment.amount,
        method: payment.method,
        transactionId: payment.transactionId,
        paidOn: payment.paidOn,
        notes: payment.notes,
      });
      await enrollment.save();
    }
  }

  await payment.save();
  if (oldStatus !== payment.status) {
    auditLog(req, {
      module: 'payments',
      action: 'update_status',
      resource: 'Payment',
      resourceId: payment._id,
      oldValue: { status: oldStatus },
      newValue: { status: payment.status },
    });
  }
  return ApiResponse.success(res, 200, 'Payment updated', { payment });
});

// @desc   Refund payment
// @route  POST /api/v1/payments/:id/refund
exports.refundPayment = asyncHandler(async (req, res, next) => {
  const payment = await Payment.findById(req.params.id);
  if (!payment) return next(new AppError('Payment not found', 404));
  if (payment.status === 'refunded') return next(new AppError('Already refunded', 400));

  const { amount, reason, refundTransactionId } = req.body;
  const refundAmount = amount || payment.amount;
  payment.status = refundAmount >= payment.amount ? 'refunded' : 'partial-refund';
  payment.refund = {
    amount: refundAmount,
    reason,
    refundTransactionId,
    refundedOn: new Date(),
  };
  await payment.save();

  // Update enrollment
  await Enrollment.findByIdAndUpdate(payment.enrollment, {
    $inc: { 'fee.paid': -refundAmount, 'fee.due': refundAmount },
  });

  auditLog(req, {
    module: 'payments',
    action: 'refund',
    resource: 'Payment',
    resourceId: payment._id,
    newValue: { amount: refundAmount, reason, status: payment.status },
  });

  return ApiResponse.success(res, 200, 'Refund processed', { payment });
});

// @desc   My fee summary (student)
// @route  GET /api/v1/payments/me/summary
exports.mySummary = asyncHandler(async (req, res) => {
  const enrollments = await Enrollment.find({ student: req.user._id })
    .populate('course', 'title fee')
    .populate('batch', 'name code');

  const totalCommitted = enrollments.reduce((s, e) => s + (e.fee.total || 0), 0);
  const totalPaid = enrollments.reduce((s, e) => s + (e.fee.paid || 0), 0);
  const totalDue = enrollments.reduce((s, e) => s + (e.fee.due || 0), 0);

  return ApiResponse.success(res, 200, 'Fee summary', {
    summary: { totalCommitted, totalPaid, totalDue },
    enrollments: enrollments.map((e) => ({
      _id: e._id,
      course: e.course,
      batch: e.batch,
      fee: e.fee,
    })),
  });
});
