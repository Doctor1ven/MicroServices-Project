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

const PORT = process.env.GATEWAY_PORT || 4000;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001';
const rateLimitWindowMs = Number(
  process.env.GATEWAY_RATE_LIMIT_WINDOW_MS || process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000
);
const rateLimitMax = Number(
  process.env.GATEWAY_RATE_LIMIT_MAX || process.env.RATE_LIMIT_MAX || 100
);

app.use(helmet());
app.use(cors({ origin: process.env.GATEWAY_CORS_ORIGIN || process.env.CORS_ORIGIN || '*' }));
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
app.use(morgan('combined'));

const proxy = createProxyMiddleware({
  pathFilter: ['/api', '/health'],
  target: BACKEND_URL,
  changeOrigin: true,
  xfwd: true
});

app.use(proxy);

app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
  console.log(`Proxying /api and /health to ${BACKEND_URL}`);
});
