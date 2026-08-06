const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

const userCtrl = require('../controllers/userController');
const { protect, authorize, ownerOrAdmin, can } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.use(protect);

// Self routes
router.get('/me/stats', userCtrl.myStats);
router.get('/me/enrollments', userCtrl.myEnrollments);
router.patch('/me/enrollments/:id/progress', authorize('student'), userCtrl.updateMyProgress);
router.get('/leaderboard', userCtrl.leaderboard);
router.get('/my-students', authorize('mentor', 'admin'), userCtrl.myStudents);

// Admin only
router.get('/', authorize('admin'), userCtrl.listUsers);
router.post(
  '/',
  authorize('admin'),
  [
    body('firstName').notEmpty(),
    body('lastName').notEmpty(),
    body('email').isEmail(),
    body('password').isLength({ min: 8 }),
    body('role').isIn(['admin', 'mentor', 'student']),
  ],
  validate,
  userCtrl.createUser
);

router.get('/:id/enrollments', authorize('admin', 'mentor'), userCtrl.userEnrollments);
router.get('/:id', userCtrl.getUser);
router.patch('/:id', ownerOrAdmin('id'), userCtrl.updateUser);
// can() lets these two be granted to a non-admin role later (via the Role
// document) without a code change; today's default role permissions keep
// behavior identical to the old authorize('admin')-only check.
router.delete('/:id', can('users.delete'), userCtrl.deleteUser);
router.patch('/:id/role', can('users.manage_role'), userCtrl.updateRole);

module.exports = router;
