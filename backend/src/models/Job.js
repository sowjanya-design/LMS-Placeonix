const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  requirements: [String],
  jobType: { type: String, enum: ['full-time', 'part-time', 'internship', 'contract'] },
  location: { type: String },
  isRemote: { type: Boolean, default: false },
  salaryRange: { min: Number, max: Number, currency: { type: String, default: 'INR' } },
  experienceRequired: { type: String },
  skills: [String],
  deadline: { type: Date },
  status: { type: String, enum: ['open', 'closed', 'draft'], default: 'open' },
  placementDriveId: { type: mongoose.Schema.Types.ObjectId, ref: 'PlacementDrive' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Job', jobSchema);