const mongoose = require('mongoose');

const analyticsEventSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    eventType: { 
      type: String, 
      enum: ['learning', 'placement', 'revenue', 'ide'], 
      required: true 
    },
    action: { type: String, required: true }, // e.g. 'course_completed', 'job_applied'
    metadata: { type: mongoose.Schema.Types.Mixed }, // flexible payload
  },
  { timestamps: true }
);

analyticsEventSchema.index({ eventType: 1, createdAt: -1 });
analyticsEventSchema.index({ userId: 1, eventType: 1 });

module.exports = mongoose.model('AnalyticsEvent', analyticsEventSchema);
