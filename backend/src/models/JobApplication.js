const mongoose = require('mongoose');

const jobApplicationSchema = new mongoose.Schema({
  jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true, index: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  resumeUrl: { type: String, required: true },
  coverLetter: { type: String },
  status: { type: String, enum: ['applied', 'shortlisted', 'interviewing', 'rejected', 'offered', 'hired'], default: 'applied' },
  notes: { type: String },
  appliedAt: { type: Date, default: Date.now },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

jobApplicationSchema.index({ jobId: 1, studentId: 1 }, { unique: true });

module.exports = mongoose.model('JobApplication', jobApplicationSchema);