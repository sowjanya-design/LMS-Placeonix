const mongoose = require("mongoose");

const optionSchema = new mongoose.Schema(
  {
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Question",
      required: true,
    },
    optionText: { type: String, required: true },
    isCorrect: { type: Boolean, default: false },
    explanation: String, // shown after answering
  },
  { timestamps: true },
);

optionSchema.index({ questionId: 1 });

module.exports = mongoose.model("Option", optionSchema);
