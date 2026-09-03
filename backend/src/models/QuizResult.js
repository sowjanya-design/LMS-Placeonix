const mongoose = require("mongoose");

const answerSchema = new mongoose.Schema(
  {
    question: { type: mongoose.Schema.Types.ObjectId, required: true }, // Quiz.questions[]._id
    selectedOptions: [{ type: mongoose.Schema.Types.ObjectId }], // Quiz.questions[].options[]._id
    isCorrect: Boolean,
    pointsAwarded: { type: Number, default: 0 },
  },
  { _id: false },
);

const quizResultSchema = new mongoose.Schema(
  {
    quiz: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quiz",
      required: true,
      index: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batch",
      required: true,
    },

    attemptNumber: { type: Number, required: true, default: 1 },
    answers: [answerSchema],

    score: { type: Number, default: 0 },
    maxScore: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    passed: { type: Boolean, default: false },

    status: {
      type: String,
      enum: ["in_progress", "submitted"],
      default: "in_progress",
      index: true,
    },
    startedAt: { type: Date, default: Date.now },
    submittedAt: Date,
  },
  { timestamps: true },
);

quizResultSchema.index(
  { quiz: 1, student: 1, attemptNumber: 1 },
  { unique: true },
);

module.exports = mongoose.model("QuizResult", quizResultSchema);
