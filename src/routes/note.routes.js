const express = require('express');
const { body, param } = require('express-validator');

const { createNote, deleteNote, getNotes } = require('../controllers/note.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');

const router = express.Router();

router.use(authenticate);

router.get('/', getNotes);

router.post(
  '/',
  [
    body('title')
      .trim()
      .escape()
      .isLength({ min: 1, max: 120 })
      .withMessage('Title must be between 1 and 120 characters'),
    body('content')
      .trim()
      .escape()
      .isLength({ min: 1, max: 5000 })
      .withMessage('Content must be between 1 and 5000 characters')
  ],
  validate,
  createNote
);

router.delete(
  '/:id',
  authorize('admin'),
  [param('id').isMongoId().withMessage('A valid note id is required')],
  validate,
  deleteNote
);

module.exports = router;
