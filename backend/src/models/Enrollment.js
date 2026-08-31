const mongoose = require('mongoose');
const { ENROLLMENT_STATUS } = require('../config/constants');

const enrollmentSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    batch: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', required: true, index: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },

    enrollmentDate: { type: Date, default: Date.now },
    completionDate: Date,

    status: {
      type: String,
      enum: Object.values(ENROLLMENT_STATUS),
      default: ENROLLMENT_STATUS.ENROLLED,
      index: true,
    },

    progress: {
      overall: { type: Number, default: 0, min: 0, max: 100 },
      moduleProgress: [
        {
          moduleId: { type: mongoose.Schema.Types.ObjectId },
          completedTopics: [mongoose.Schema.Types.ObjectId],
          progress: { type: Number, default: 0, min: 0, max: 100 },
          lastAccessed: Date,
        },
      ],
    },

    // Restored — this subdocument backs the entire fee/payments feature
    // (paymentController.js, batchController.enrollStudent, the fee-reminder
    // cron job). It was accidentally stripped from the schema at some point
    // (Mongoose silently drops unknown fields in strict mode, so every write
    // to enrollment.fee since then was a silent no-op, and every read
    // crashed with "Cannot read properties of undefined" — see the payments
    // test suite, which was failing against this exact gap).
    fee: {
      total: { type: Number, default: 0, min: 0 },
      paid: { type: Number, default: 0, min: 0 },
      due: { type: Number, default: 0, min: 0 },
      payments: [
        {
          amount: Number,
          method: String,
          transactionId: String,
          paidOn: Date,
          notes: String,
        },
      ],
    },

    certificateIssued: { type: Boolean, default: false },
    certificateUrl: String,

    finalScore: Number,
    grade: String,

    feedback: {
      rating: { type: Number, min: 1, max: 5 },
      comment: String,
      submittedAt: Date,
    },

    notes: String,
  },
  { timestamps: true }
);

enrollmentSchema.virtual('isPaidFull').get(function () {
  return (this.fee?.due || 0) <= 0;
});

enrollmentSchema.index({ student: 1, batch: 1 }, { unique: true });
enrollmentSchema.index({ status: 1, batch: 1 });



module.exports = mongoose.model('Enrollment', enrollmentSchema);
