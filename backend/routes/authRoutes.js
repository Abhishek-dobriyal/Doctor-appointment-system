const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const registerRules = [
  body('email').isEmail().normalizeEmail().isLength({ max: 255 }),
  body('password').isLength({ min: 8, max: 128 }),
  body('name').optional().trim().isLength({ max: 120 }),
];

const loginRules = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
];

const otpRules = [
  body('otpChallengeToken').notEmpty(),
  body('code').isLength({ min: 4, max: 8 }),
];

router.post('/register', registerRules, authController.register);
router.post('/login', loginRules, authController.login);
router.post('/verify-otp', otpRules, authController.verifyOtp);
router.get('/me', requireAuth, authController.me);
router.patch('/otp-setting', requireAuth, body('enabled').isBoolean(), authController.toggleOtp);

module.exports = router;
