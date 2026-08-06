const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { protect, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/alumniController');
const validate = require('../middleware/validate');

router.use(protect);

router.get('/', ctrl.listAlumni); // all roles can view the showcase
router.post(
  '/',
  authorize('admin'),
  [
    body('name').notEmpty().trim(),
    body('company').notEmpty().trim(),
    body('role').optional().trim(),
    body('featured').optional().isBoolean(),
  ],
  validate,
  ctrl.createAlumni
);
router.patch(
  '/:id',
  authorize('admin'),
  [body('name').optional().notEmpty().trim(), body('company').optional().notEmpty().trim()],
  validate,
  ctrl.updateAlumni
);
router.delete('/:id', authorize('admin'), ctrl.deleteAlumni);

module.exports = router;
