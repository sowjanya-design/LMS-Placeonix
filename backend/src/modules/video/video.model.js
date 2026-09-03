const mongoose = require("mongoose");

const videoSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    lessonId: {
      type: mongoose.Schema.Types.ObjectId,
      // Note: Depends on whether lessons are their own model or embedded.
      // We assume a simple ObjectId reference for now.
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    videoUID: {
      type: String,
      required: true,
      unique: true,
    },
    provider: {
      type: String,
      default: "cloudflare",
    },
    thumbnail: {
      type: String,
    },
    duration: {
      type: Number, // in seconds
      default: 0,
    },
    status: {
      type: String,
      enum: ["pending", "processing", "ready", "failed"],
      default: "pending",
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Video", videoSchema);
