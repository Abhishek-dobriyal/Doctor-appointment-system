const express = require('express');
const { body, param } = require('express-validator');
const userController = require('../controllers/userController');
const { requireAuth, requireRoles } = require('../middleware/auth');

const router = express.Router();

router.get('/doctors', requireAuth, userController.listDoctors);

router.patch(
  '/profile',
  requireAuth,
  body('name').optional().trim().isLength({ max: 120 }),
  body('dob').optional().isISO8601(),
  body('gender').optional().isIn(['male', 'female', 'other', '']),
  body('phone').optional().trim().isLength({ max: 32 }),
  body('specialization').optional().trim().isLength({ max: 120 }),
  body('bio').optional().trim().isLength({ max: 2000 }),
  userController.updateProfile
);

router.post(
  '/change-password',
  requireAuth,
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 8, max: 128 }),
  userController.changePassword
);

router.get('/admin/users', requireAuth, requireRoles('admin'), userController.adminListUsers);
router.get('/admin/users/:id', requireAuth, requireRoles('admin'), param('id').isMongoId(), userController.adminGetUser);
router.post(
  '/admin/users',
  requireAuth,
  requireRoles('admin'),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8, max: 128 }),
  body('role').isIn(['patient', 'doctor', 'admin']),
  body('name').optional().trim(),
  body('specialization').optional().trim(),
  body('phone').optional().trim(),
  userController.adminCreateUser
);
router.patch('/admin/users/:id', requireAuth, requireRoles('admin'), param('id').isMongoId(), userController.adminUpdateUser);
router.delete('/admin/users/:id', requireAuth, requireRoles('admin'), param('id').isMongoId(), userController.adminDeleteUser);

module.exports = router;
