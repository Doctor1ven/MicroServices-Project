const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');

const authRoutes = require('./routes/auth.routes');
const adminRoutes = require('./routes/admin.routes');
const noteRoutes = require('./routes/note.routes');
const swaggerSpec = require('./config/swagger');
const { errorHandler, notFoundHandler } = require('./middleware/error.middleware');
const rateLimiter = require('./middleware/rateLimiter.middleware');
const logger = require('./config/logger');

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(mongoSanitize());
app.use(rateLimiter);
app.use(
  morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim())
    }
  })
);

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
