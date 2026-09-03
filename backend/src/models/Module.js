const mongoose = require("mongoose");

const moduleSchema = new mongoose.Schema(
  {
    moduleCode: { type: String, required: true, unique: true },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    title: { type: String, required: true, trim: true },
    description: String,
    order: { type: Number, required: true },
    duration: { type: Number, default: 0 }, // in minutes
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
    },
  },
  { timestamps: true },
);

moduleSchema.index({ courseId: 1, order: 1 });

module.exports = mongoose.model("Module", moduleSchema);
