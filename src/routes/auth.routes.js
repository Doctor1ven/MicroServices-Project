const express = require('express');
const { body } = require('express-validator');

const { login, register } = require('../controllers/auth.controller');
const validate = require('../middleware/validate.middleware');

const router = express.Router();

const emailValidator = body('email')
  .trim()
  .normalizeEmail()
  .isEmail()
  .withMessage('A valid email is required')
  .isLength({ max: 254 })
  .withMessage('Email is too long');

router.post(
  '/register',
  [
    body('name')
      .trim()
      .escape()
      .isLength({ min: 2, max: 80 })
      .withMessage('Name must be between 2 and 80 characters'),
    emailValidator,
    body('password')
      .isStrongPassword({
        minLength: 8,
        minLowercase: 1,
        minUppercase: 1,
        minNumbers: 1,
        minSymbols: 1
      })
      .withMessage(
        'Password must be at least 8 characters and include uppercase, lowercase, number, and symbol'
      ),
    body('role')
      .optional()
      .isIn(['admin', 'user'])
      .withMessage('Role must be admin or user')
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

module.exports = router;
