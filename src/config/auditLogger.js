const path = require('path');
const fs = require('fs');
const winston = require('winston');

fs.mkdirSync(path.resolve('logs'), { recursive: true });

const auditLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [
    new winston.transports.File({
      filename: path.join('logs', 'audit.log')
    })
  ]
});

const audit = (event, metadata = {}) => {
  auditLogger.info({ event, ...metadata });
};

module.exports = {
  audit,
  auditLogger
};
