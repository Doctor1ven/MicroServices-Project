const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const requireEnv = (name) => {
  if (!process.env[name]) {
    throw new Error(`${name} is required`);
  }

  return process.env[name];
};

const signAccessToken = (user) => {
  return jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role
    },
    requireEnv('JWT_SECRET'),
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );
};

const signRefreshToken = (user, tokenId) => {
  return jwt.sign(
    {
      sub: user._id.toString(),
      jti: tokenId
    },
    requireEnv('REFRESH_TOKEN_SECRET'),
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d' }
  );
};

const verifyRefreshToken = (token) => {
  return jwt.verify(token, requireEnv('REFRESH_TOKEN_SECRET'));
};

const createPasswordResetToken = () => {
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  return { token, tokenHash };
};

module.exports = {
  createPasswordResetToken,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken
};
