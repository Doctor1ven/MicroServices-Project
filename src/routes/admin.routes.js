const express = require('express');
const { param } = require('express-validator');

const { deleteUser, getLogs, getNotes, getUsers } = require('../controllers/admin.controller');
const { requireAdmin } = require('../middleware/admin.middleware');
const validate = require('../middleware/validate.middleware');

const router = express.Router();

router.use(requireAdmin);

router.get('/users', getUsers);

router.delete(
  '/users/:id',
  [param('id').isMongoId().withMessage('A valid user id is required')],
  validate,
  deleteUser
);

router.get('/notes', getNotes);

router.get('/logs', getLogs);

module.exports = router;
