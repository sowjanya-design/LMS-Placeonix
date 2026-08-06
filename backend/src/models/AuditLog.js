const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    userEmail: String, // denormalized so logs stay readable if the user is later deleted
    module: { type: String, required: true, index: true }, // e.g. 'auth', 'users', 'payments'
    action: { type: String, required: true, index: true }, // e.g. 'login', 'update_role', 'refund'
    resource: String, // e.g. 'User', 'Payment'
    resourceId: { type: mongoose.Schema.Types.ObjectId },
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed,
    ipAddress: String,
    userAgent: String,
    status: { type: String, enum: ['success', 'failure'], default: 'success' },
    message: String,
  },
  { timestamps: true }
);

auditLogSchema.index({ module: 1, action: 1, createdAt: -1 });
auditLogSchema.index({ userId: 1, createdAt: -1 });

// Fire-and-forget: an audit log write must never break the request it's logging.
auditLogSchema.statics.record = async function (entry) {
  try {
    await this.create(entry);
  } catch (err) {
    require('../utils/logger').error(`AuditLog write failed: ${err.message}`);
  }
};

module.exports = mongoose.model('AuditLog', auditLogSchema);
