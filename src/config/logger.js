const path = require('path');
const winston = require('winston');

const logFormat = winston.format.printf(({ timestamp, level, message, stack }) => {
  return `${timestamp} [${level}]: ${stack || message}`;
});

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    logFormat
  ),
  transports: [new winston.transports.Console()]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.File({
      filename: path.join('logs', 'error.log'),
      level: 'error'
    })
  );
  logger.add(
    new winston.transports.File({
      filename: path.join('logs', 'combined.log')
    })
  );
}

module.exports = logger;
