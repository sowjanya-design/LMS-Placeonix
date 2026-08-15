const mongoose = require('mongoose');

const lessonSchema = new mongoose.Schema(
  {
    lessonCode: { type: String, required: true, unique: true },
    moduleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Module', required: true },
    title: { type: String, required: true, trim: true },
    lessonType: { type: String, enum: ['video', 'reading', 'quiz', 'assignment'], required: true },
    provider: { type: String }, // e.g. 'cloudflare'
    duration: { type: Number, default: 0 }, // in minutes
    order: { type: Number, required: true },
    isPreview: { type: Boolean, default: false }, // if true, non-enrolled students can view it
  },
  { timestamps: true }
);

lessonSchema.index({ moduleId: 1, order: 1 });

module.exports = mongoose.model('Lesson', lessonSchema);
