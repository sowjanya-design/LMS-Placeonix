const mongoose = require("mongoose");

// Options/Questions are embedded (not separate collections) — same pattern this
// codebase already uses for Assignment.submissions. Keeps auto-grading a single
// document read/write instead of a join across 3 collections, at the cost of not
// being able to reuse a question bank across quizzes (acceptable for v1).
const optionSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true, maxlength: 500 },
    isCorrect: { type: Boolean, default: false },
  },
  { _id: true },
);

const questionSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true, maxlength: 1000 },
    type: { type: String, enum: ["single", "multi"], default: "single" }, // single = one correct option, multi = one-or-more
    options: {
      type: [optionSchema],
      validate: {
        validator: (opts) => opts.length >= 2 && opts.some((o) => o.isCorrect),
        message:
          "Each question needs at least 2 options and at least 1 marked correct",
      },
    },
    points: { type: Number, default: 1, min: 0 },
    order: { type: Number, default: 0 },
  },
  { _id: true },
);

const quizSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: String,

    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },
    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batch",
      required: true,
      index: true,
    },
    module: { type: mongoose.Schema.Types.ObjectId },

    questions: {
      type: [questionSchema],
      validate: {
        validator: (qs) => qs.length > 0,
        message: "A quiz needs at least 1 question",
      },
    },

    timeLimitMinutes: { type: Number, default: 30, min: 1 },
    maxAttempts: { type: Number, default: 1, min: 1 },
    passingScorePercent: { type: Number, default: 60, min: 0, max: 100 },

    availableFrom: Date,
    availableUntil: Date,

    status: {
      type: String,
      enum: ["draft", "published", "closed"],
      default: "draft",
      index: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

quizSchema.index({ batch: 1, status: 1 });

quizSchema.virtual("maxScore").get(function () {
  return this.questions.reduce((sum, q) => sum + (q.points || 0), 0);
});

quizSchema.virtual("isOpen").get(function () {
  const now = new Date();
  if (this.status !== "published") return false;
  if (this.availableFrom && now < this.availableFrom) return false;
  if (this.availableUntil && now > this.availableUntil) return false;
  return true;
});

// Returns a plain object with correct-answer info stripped — for a student
// taking (not reviewing) the quiz. isCorrect must never reach the client
// before submission, or the quiz is trivially gameable via devtools.
quizSchema.methods.toStudentView = function () {
  const obj = this.toObject();
  obj.questions = obj.questions.map((q) => ({
    ...q,
    options: q.options.map((o) => ({ _id: o._id, text: o.text })),
  }));
  return obj;
};

module.exports = mongoose.model("Quiz", quizSchema);
