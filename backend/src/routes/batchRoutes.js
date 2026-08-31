const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const batchCtrl = require('../controllers/batchController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.use(protect);

router.get('/', batchCtrl.listBatches);
router.get('/:id', batchCtrl.getBatch);

router.post(
  '/',
  authorize('admin'),
  [
    body('name').notEmpty(),
    body('code').notEmpty(),
    body('course').isMongoId(),
    body('mentor').isMongoId(),
    body('capacity').optional().isInt({ min: 1 }),
    body('startDate').isISO8601(),
    body('endDate').isISO8601(),
  ],
  validate,
  batchCtrl.createBatch
);
router.patch(
  '/:id',
  authorize('admin'),
  [
    body('name').optional().notEmpty(),
    body('capacity').optional().isInt({ min: 1 }),
    body('startDate').optional().isISO8601(),
    body('endDate').optional().isISO8601(),
  ],
  validate,
  batchCtrl.updateBatch
);
router.delete('/:id', authorize('admin'), batchCtrl.deleteBatch);

router.post(
  '/:id/enroll',
  authorize('admin'),
  [body('studentId').isMongoId(), body('fee').optional().isFloat({ min: 0 })],
  validate,
  batchCtrl.enrollStudent
);
router.delete('/:id/enroll/:studentId', authorize('admin'), batchCtrl.unenrollStudent);

router.post(
  '/:id/bulk-email',
  authorize('admin'),
  [body('subject').notEmpty(), body('body').notEmpty()],
  validate,
  batchCtrl.bulkEmail
);

module.exports = router;
