const express = require('express');
const router = express.Router();

const { listAuditLogs } = require('../controllers/auditLogController');
const { protect, can } = require('../middleware/auth');

router.get('/', protect, can('audit_logs.view'), listAuditLogs);

module.exports = router;
