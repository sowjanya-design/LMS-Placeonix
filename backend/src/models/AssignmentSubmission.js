const mongoose = require('mongoose');

const assignmentSubmissionSchema = new mongoose.Schema({
  assignmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment', required: true, index: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },
  content: { type: String }, // Optional rich text
  attachments: [{ title: String, url: String }], // File uploads
  status: { type: String, enum: ['submitted', 'graded', 'returned'], default: 'submitted' },
  grade: { type: Number, min: 0 },
  feedback: { type: String },
  gradedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  gradedAt: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('AssignmentSubmission', assignmentSubmissionSchema);