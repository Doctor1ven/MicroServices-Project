const logger = require('../config/logger');

const notFoundHandler = (req, res) => {
  res.status(404).json({ message: `Route not found: ${req.originalUrl}` });
};

const errorHandler = (error, _req, res, _next) => {
  logger.error(error);

  if (error.name === 'CastError') {
    return res.status(400).json({ message: 'Invalid resource id' });
  }

  if (error.code === 11000) {
    return res.status(409).json({ message: 'Duplicate resource' });
  }

  if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors).map((item) => ({
      field: item.path,
      message: item.message
    }));
    return res.status(400).json({ message: 'Validation failed', errors });
  }

  return res.status(500).json({ message: 'Internal server error' });
};

module.exports = {
  errorHandler,
  notFoundHandler
};
