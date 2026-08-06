const AuditLog = require('../models/AuditLog');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

// @desc   List audit logs (admin only)
// @route  GET /api/v1/audit-logs?module=&action=&userId=&status=&page=&limit=
exports.listAuditLogs = asyncHandler(async (req, res) => {
  const { module, action, userId, status, page = 1, limit = 50 } = req.query;
  const filter = {};
  if (module) filter.module = module;
  if (action) filter.action = action;
  if (userId) filter.userId = userId;
  if (status) filter.status = status;

  const total = await AuditLog.countDocuments(filter);
  const logs = await AuditLog.find(filter)
    .sort('-createdAt')
    .skip((page - 1) * limit)
    .limit(Number(limit));

  return ApiResponse.paginated(res, 'Audit logs fetched', logs, page, limit, total);
});
