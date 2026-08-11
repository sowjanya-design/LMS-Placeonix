const mongoose = require('mongoose');

const watchHistorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  lessonId: { type: mongoose.Schema.Types.ObjectId, required: true },
  watchedDuration: { type: Number, default: 0 }, // in seconds
  totalDuration: { type: Number }, // in seconds
  lastPosition: { type: Number, default: 0 },
  completed: { type: Boolean, default: false },
}, { timestamps: true });

watchHistorySchema.index({ userId: 1, courseId: 1, lessonId: 1 }, { unique: true });

module.exports = mongoose.model('WatchHistory', watchHistorySchema);