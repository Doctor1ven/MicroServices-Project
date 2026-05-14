const express = require('express');
const { body } = require('express-validator');

const {
  forgotPassword,
  login,
  logout,
  refresh,
  register,
  resetPassword
} = require('../controllers/auth.controller');
const validate = require('../middleware/validate.middleware');

const router = express.Router();

const emailValidator = body('email')
  .trim()
  .normalizeEmail()
  .isEmail()
  .withMessage('A valid email is required')
  .isLength({ max: 254 })
  .withMessage('Email is too long');

const strongPasswordValidator = body('password')
  .isStrongPassword({
    minLength: 8,
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 1
  })
  .withMessage(
    'Password must be at least 8 characters and include uppercase, lowercase, number, and symbol'
  );

router.post(
  '/register',
  [
    body('name')
      .trim()
      .escape()
      .isLength({ min: 2, max: 80 })
      .withMessage('Name must be between 2 and 80 characters'),
    emailValidator,
    strongPasswordValidator
  ],
  validate,
  register
);

router.post(
  '/login',
  [
    emailValidator,
    body('password').isString().notEmpty().withMessage('Password is required')
  ],
  validate,
  login
);

router.post(
  '/refresh',
  [body('refreshToken').isJWT().withMessage('A valid refresh token is required')],
  validate,
  refresh
);

router.post(
  '/logout',
  [body('refreshToken').isJWT().withMessage('A valid refresh token is required')],
  validate,
  logout
);

router.post('/forgot-password', [emailValidator], validate, forgotPassword);

router.post(
  '/reset-password',
  [
    emailValidator,
    body('token').isString().isLength({ min: 64, max: 64 }).withMessage('Reset token is required'),
    strongPasswordValidator
  ],
  validate,
  resetPassword
);

module.exports = router;
