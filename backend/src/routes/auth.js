const router   = require('express').Router();
const { body } = require('express-validator');
const auth     = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');
const ctrl     = require('../controllers/authController');

// ─── Validation rule sets ─────────────────────────────────────────────────────

const registerRules = [
  body('name').trim().notEmpty().withMessage('Họ tên là bắt buộc')
    .isLength({ min: 2 }).withMessage('Họ tên phải có ít nhất 2 ký tự')
    .isLength({ max: 50 }).withMessage('Họ tên không được vượt quá 50 ký tự'),
  body('email').isEmail().withMessage('Email không hợp lệ').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Mật khẩu phải có ít nhất 6 ký tự'),
  body('confirmPassword').notEmpty().withMessage('Vui lòng xác nhận mật khẩu')
    .custom((value, { req }) => {
      if (value !== req.body.password) throw new Error('Mật khẩu xác nhận không khớp');
      return true;
    }),
];

const loginRules = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

const changePasswordRules = [
  body('oldPassword').notEmpty().withMessage('Old password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
];

// ─── Public routes ────────────────────────────────────────────────────────────

router.post('/register',      registerRules,       validate, ctrl.register);
router.post('/login',         loginRules,          validate, ctrl.login);
router.post('/logout',                                       ctrl.logout);
router.post('/refresh-token',                                ctrl.refreshToken);

// ─── Protected routes ─────────────────────────────────────────────────────────

router.get('/me',              auth,                          ctrl.getMe);
router.put('/profile',         auth,                          ctrl.updateProfile);
router.put('/change-password', auth, changePasswordRules, validate, ctrl.changePassword);

module.exports = router;
