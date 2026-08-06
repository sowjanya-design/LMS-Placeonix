const express = require('express');
const router = express.Router();

const { listAuditLogs } = require('../controllers/auditLogController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', protect, authorize('admin'), listAuditLogs);

module.exports = router;
