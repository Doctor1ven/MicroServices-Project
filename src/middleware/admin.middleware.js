const { authenticate } = require('./auth.middleware');

const authorizeAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied' });
  }

  return next();
};

module.exports = {
  requireAdmin: [authenticate, authorizeAdmin],
  authorizeAdmin
};
