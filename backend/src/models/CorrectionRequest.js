const mongoose = require('mongoose');

const correctionRequestSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: Date, required: true }, // The date of the attendance record being corrected
    
    reason: {
      type: String,
      enum: ['Forgot to punch in', 'Forgot to punch out', 'Technical issue', 'Other'],
      required: true
    },
    description: { type: String, required: true },
    attachmentUrl: String,

    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending'
    },

    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewRemark: String,
    resolvedAt: Date
  },
  { timestamps: true }
);

module.exports = mongoose.model('CorrectionRequest', correctionRequestSchema);
