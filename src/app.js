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
const isProduction = process.env.NODE_ENV === 'production';

const parseOrigins = (...values) =>
  values
    .filter(Boolean)
    .flatMap((value) => value.split(','))
    .map((value) => value.trim().replace(/\/$/, ''))
    .filter(Boolean);

const allowedOrigins = parseOrigins(
  process.env.CORS_ORIGIN,
  process.env.FRONTEND_URL,
  process.env.API_PUBLIC_URL
);

const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);

    if (!isProduction && allowedOrigins.length === 0) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin.replace(/\/$/, ''))) {
      return callback(null, true);
    }

    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
};

app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(mongoSanitize());
app.use(rateLimiter);
if (isProduction) {
  app.use(
    morgan('combined', {
      skip: (_req, res) => res.statusCode < 400,
      stream: {
        write: (message) => logger.info(message.trim())
      }
    })
  );
} else {
  app.use(
    morgan('dev', {
      stream: {
        write: (message) => logger.debug(message.trim())
      }
    })
  );
}

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
