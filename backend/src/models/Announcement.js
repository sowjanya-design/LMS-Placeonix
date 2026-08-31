const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    body: { type: String, required: true },
    type: {
      type: String,
      enum: ['general', 'placement', 'holiday', 'urgent', 'event'],
      default: 'general',
    },
    priority: { type: String, enum: ['low', 'normal', 'high'], default: 'normal' },

    audience: {
      roles: [{ type: String, enum: ['admin', 'mentor', 'student'] }],
      batches: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Batch' }],
      courses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
      isPublic: { type: Boolean, default: false },
    },

    attachments: [{ filename: String, url: String }],

    publishAt: { type: Date, default: Date.now },
    expiresAt: Date,
    isPinned: { type: Boolean, default: false },
    isPublished: { type: Boolean, default: true },
    // Set only on holiday announcements created automatically by
    // holidaySyncService (see backend/src/data/indiaHolidays.js). Lets the
    // frontend show a "system" badge and hide destructive actions, and lets
    // the sync job cheaply check "is there already a holiday on this date"
    // without matching on title text.
    isSystemHoliday: { type: Boolean, default: false },

    readBy: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        readAt: { type: Date, default: Date.now },
      },
    ],

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

announcementSchema.index({ isPublished: 1, publishAt: -1 });
announcementSchema.index({ 'audience.roles': 1 });

module.exports = mongoose.model('Announcement', announcementSchema);
