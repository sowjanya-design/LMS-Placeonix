const AuditLog = require("../models/AuditLog");

/**
 * Records an audit log entry from a request + a domain-specific action.
 * Never throws — logging failures must not affect the request they describe.
 *
 * @param {import('express').Request} req
 * @param {{module: string, action: string, resource?: string, resourceId?: any,
 *          oldValue?: any, newValue?: any, status?: 'success'|'failure', message?: string,
 *          userId?: any, userEmail?: string}} entry
 */
function auditLog(req, entry) {
  return AuditLog.record({
    userId: entry.userId ?? req.user?._id,
    userEmail: entry.userEmail ?? req.user?.email,
    ipAddress: req.ip,
    userAgent: req.headers?.["user-agent"],
    status: "success",
    ...entry,
  });
}

module.exports = { auditLog };
