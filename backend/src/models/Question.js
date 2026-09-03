const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema(
  {
    quizId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quiz",
      required: true,
    },
    questionText: { type: String, required: true },
    questionType: {
      type: String,
      enum: ["multiple_choice", "single_choice", "true_false"],
      default: "single_choice",
    },
    marks: { type: Number, default: 1 },
    order: { type: Number, default: 0 },
    options: [{ type: mongoose.Schema.Types.ObjectId, ref: "Option" }],
  },
  { timestamps: true },
);

questionSchema.index({ quizId: 1, order: 1 });

module.exports = mongoose.model("Question", questionSchema);
