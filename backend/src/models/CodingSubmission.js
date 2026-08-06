const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema(
  {
    testCase: { type: mongoose.Schema.Types.ObjectId, required: true }, // CodingChallenge.testCases[]._id
    isHidden: Boolean,
    passed: Boolean,
    pointsAwarded: { type: Number, default: 0 },
    // Only populated for non-hidden test cases — see codingChallengeController.
    // Hidden test cases must never reveal actual output, or a student could
    // reconstruct the expected answer from repeated failed submissions.
    stdout: String,
    stderr: String,
  },
  { _id: false }
);

const codingSubmissionSchema = new mongoose.Schema(
  {
    challenge: { type: mongoose.Schema.Types.ObjectId, ref: 'CodingChallenge', required: true, index: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    batch: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', required: true },

    language: { type: String, required: true },
    code: { type: String, required: true },
    attemptNumber: { type: Number, required: true, default: 1 },

    results: [resultSchema],
    score: { type: Number, default: 0 },
    maxScore: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    passed: { type: Boolean, default: false },

    status: { type: String, enum: ['grading', 'graded', 'error'], default: 'grading', index: true },
    submittedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

codingSubmissionSchema.index({ challenge: 1, student: 1, attemptNumber: 1 }, { unique: true });

module.exports = mongoose.model('CodingSubmission', codingSubmissionSchema);
