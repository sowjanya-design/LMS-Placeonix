const mongoose = require('mongoose');
const LANGUAGES = require('../config/codeLanguages');

// Test cases are embedded (same tradeoff as Quiz.questions — no reuse across
// challenges, but grading is a single document read). isHidden test cases'
// expectedOutput is never sent to the client — see codingChallengeController.
const testCaseSchema = new mongoose.Schema(
  {
    input: { type: String, default: '' },
    expectedOutput: { type: String, required: true },
    isHidden: { type: Boolean, default: false },
    points: { type: Number, default: 1, min: 0 },
  },
  { _id: true }
);

const codingChallengeSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, required: true },

    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    batch: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', required: true, index: true },
    module: { type: mongoose.Schema.Types.ObjectId },

    allowedLanguages: {
      type: [{ type: String, enum: Object.keys(LANGUAGES) }],
      default: () => Object.keys(LANGUAGES),
      validate: { validator: (arr) => arr.length > 0, message: 'At least 1 language must be allowed' },
    },
    starterCode: { type: Map, of: String, default: {} }, // language -> starter snippet

    testCases: {
      type: [testCaseSchema],
      validate: {
        // Capped at 20 — each submission executes every test case sequentially
        // against the external sandbox, so this directly bounds per-submission
        // execution cost/latency, not just data size.
        validator: (tc) => tc.length > 0 && tc.length <= 20,
        message: 'A challenge needs 1-20 test cases',
      },
    },

    maxAttempts: { type: Number, default: 5, min: 1 },
    status: { type: String, enum: ['draft', 'published', 'closed'], default: 'draft', index: true },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

codingChallengeSchema.index({ batch: 1, status: 1 });

codingChallengeSchema.virtual('maxScore').get(function () {
  return this.testCases.reduce((sum, tc) => sum + (tc.points || 0), 0);
});

// Student-safe view: hidden test cases keep their input/points visibility
// (so students know how many hidden cases exist) but never their
// expectedOutput — that's the actual answer key.
codingChallengeSchema.methods.toStudentView = function () {
  const obj = this.toObject();
  obj.testCases = obj.testCases.map((tc) =>
    tc.isHidden
      ? { _id: tc._id, isHidden: true, points: tc.points }
      : tc
  );
  return obj;
};

module.exports = mongoose.model('CodingChallenge', codingChallengeSchema);
