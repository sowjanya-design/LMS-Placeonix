const mongoose = require('mongoose');

const bookmarkSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  lessonId: { type: mongoose.Schema.Types.ObjectId },
  type: { type: String, enum: ['course', 'lesson', 'resource'], required: true },
  notes: { type: String, maxlength: 1000 },
}, { timestamps: true });

module.exports = mongoose.model('Bookmark', bookmarkSchema);