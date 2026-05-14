const fs = require('fs/promises');
const path = require('path');

const { audit } = require('../config/auditLogger');
const Note = require('../models/Note');
const User = require('../models/User');

const getUsers = async (_req, res, next) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    return res.status(200).json({ users });
  } catch (error) {
    return next(error);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await Note.deleteMany({ owner: user._id });
    await user.deleteOne();

    audit('admin_user_deleted', {
      adminId: req.user.id,
      deletedUserId: user._id.toString(),
      deletedUserEmail: user.email
    });

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
};

const getNotes = async (_req, res, next) => {
  try {
    const notes = await Note.find()
      .populate('owner', 'name email role')
      .sort({ createdAt: -1 });

    return res.status(200).json({ notes });
  } catch (error) {
    return next(error);
  }
};

const getLogs = async (_req, res, next) => {
  try {
    const auditLogPath = path.resolve('logs', 'audit.log');
    const contents = await fs.readFile(auditLogPath, 'utf8').catch((error) => {
      if (error.code === 'ENOENT') {
        return '';
      }

      throw error;
    });

    const logs = contents
      .trim()
      .split('\n')
      .filter(Boolean)
      .slice(-100)
      .reverse()
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return { message: line };
        }
      });

    return res.status(200).json({ logs });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  deleteUser,
  getLogs,
  getNotes,
  getUsers
};
