const path = require('path');

const cors = require('cors');
const dotenv = require('dotenv');
const express = require('express');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const { createProxyMiddleware } = require('http-proxy-middleware');
const morgan = require('morgan');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const app = express();

const isProduction = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || process.env.GATEWAY_PORT || 4000;
const BACKEND_URL = process.env.BACKEND_URL;
const rateLimitWindowMs = Number(
  process.env.GATEWAY_RATE_LIMIT_WINDOW_MS || process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000
);
const rateLimitMax = Number(
  process.env.GATEWAY_RATE_LIMIT_MAX || process.env.RATE_LIMIT_MAX || 100
);

if (!BACKEND_URL) {
  throw new Error('BACKEND_URL is required for the API Gateway');
}

const parseOrigins = (...values) =>
  values
    .filter(Boolean)
    .flatMap((value) => value.split(','))
    .map((value) => value.trim().replace(/\/$/, ''))
    .filter(Boolean);

const allowedOrigins = parseOrigins(
  process.env.GATEWAY_CORS_ORIGIN,
  process.env.CORS_ORIGIN,
  process.env.FRONTEND_URL
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
app.use(
  rateLimit({
    windowMs: rateLimitWindowMs,
    max: rateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      message: 'Too many requests, please try again later'
    }
  })
);
app.use(isProduction ? morgan('combined', { skip: (_req, res) => res.statusCode < 400 }) : morgan('dev'));

const proxy = createProxyMiddleware({
  pathFilter: ['/api', '/health'],
  target: BACKEND_URL,
  changeOrigin: true,
  xfwd: true
});

app.use(proxy);

app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
  if (!isProduction) {
    console.log(`Proxying /api and /health to ${BACKEND_URL}`);
  }
});
