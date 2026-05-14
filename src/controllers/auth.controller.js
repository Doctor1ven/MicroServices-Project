const crypto = require('crypto');

const { audit } = require('../config/auditLogger');
const logger = require('../config/logger');
const RefreshToken = require('../models/RefreshToken');
const User = require('../models/User');
const {
  createPasswordResetToken,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken
} = require('../utils/tokens');

const MAX_FAILED_LOGIN_ATTEMPTS = Number(process.env.MAX_FAILED_LOGIN_ATTEMPTS || 5);
const ACCOUNT_LOCK_MS = Number(process.env.ACCOUNT_LOCK_MS || 15 * 60 * 1000);
const RESET_TOKEN_TTL_MS = Number(process.env.RESET_TOKEN_TTL_MS || 15 * 60 * 1000);
const REFRESH_TOKEN_TTL_MS = Number(
  process.env.REFRESH_TOKEN_TTL_MS || 7 * 24 * 60 * 60 * 1000
);

const issueTokens = async (user) => {
  const refreshTokenRecord = await RefreshToken.create({
    user: user._id,
    tokenHash: crypto.randomBytes(32).toString('hex'),
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS)
  });

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user, refreshTokenRecord._id.toString());

  refreshTokenRecord.tokenHash = RefreshToken.hashToken(refreshToken);
  await refreshTokenRecord.save();

  return { accessToken, refreshToken };
};

const publicUser = async (userId) => User.findById(userId);

const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'Email is already registered' });
    }

    const user = await User.create({ name, email, password, role: 'user' });
    const tokens = await issueTokens(user);

    audit('register_success', { userId: user._id.toString(), email: user.email });

    return res.status(201).json({
      message: 'User registered successfully',
      ...tokens,
      user
    });
  } catch (error) {
    return next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      logger.warn(`Failed login for unknown email: ${email}`);
      audit('login_failure', { email, reason: 'unknown_user' });
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (user.isLocked()) {
      audit('login_failure', {
        userId: user._id.toString(),
        email: user.email,
        reason: 'account_locked',
        lockUntil: user.lockUntil
      });
      return res.status(423).json({ message: 'Account locked. Try again later.' });
    }

    const passwordMatches = await user.comparePassword(password);
    if (!passwordMatches) {
      user.failedLoginAttempts += 1;

      if (user.failedLoginAttempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
        user.lockUntil = new Date(Date.now() + ACCOUNT_LOCK_MS);
        audit('account_lockout', {
          userId: user._id.toString(),
          email: user.email,
          lockUntil: user.lockUntil
        });
      }

      await user.save();

      logger.warn(`Failed login for user ${user._id}: ${user.email}`);
      audit('login_failure', {
        userId: user._id.toString(),
        email: user.email,
        failedLoginAttempts: user.failedLoginAttempts
      });

      return res.status(401).json({ message: 'Invalid email or password' });
    }

    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    await user.save();

    const tokens = await issueTokens(user);
    const safeUser = await publicUser(user._id);

    audit('login_success', { userId: user._id.toString(), email: user.email });

    return res.status(200).json({
      message: 'Login successful',
      ...tokens,
      user: safeUser
    });
  } catch (error) {
    return next(error);
  }
};

const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    const decoded = verifyRefreshToken(refreshToken);
    const tokenHash = RefreshToken.hashToken(refreshToken);

    const storedToken = await RefreshToken.findOne({
      _id: decoded.jti,
      user: decoded.sub,
      tokenHash,
      revokedAt: null,
      expiresAt: { $gt: new Date() }
    }).populate('user');

    if (!storedToken || !storedToken.user) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    const accessToken = signAccessToken(storedToken.user);

    return res.status(200).json({ accessToken, refreshToken });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    return next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    let userId;

    if (refreshToken) {
      try {
        userId = verifyRefreshToken(refreshToken).sub;
      } catch {
        userId = undefined;
      }

      await RefreshToken.findOneAndUpdate(
        { tokenHash: RefreshToken.hashToken(refreshToken), revokedAt: null },
        { revokedAt: new Date() }
      );
    }

    audit('logout', { userId });
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email }).select('+resetPasswordToken +resetPasswordExpires');

    if (user) {
      const { token, tokenHash } = createPasswordResetToken();
      user.resetPasswordToken = tokenHash;
      user.resetPasswordExpires = new Date(Date.now() + RESET_TOKEN_TTL_MS);
      await user.save();

      const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}&email=${encodeURIComponent(user.email)}`;
      logger.info(`Password reset link for ${user.email}: ${resetLink}`);
      audit('password_reset_requested', { userId: user._id.toString(), email: user.email });
    }

    return res.status(200).json({
      message: 'If an account exists, a password reset token has been generated.'
    });
  } catch (error) {
    return next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { email, token, password } = req.body;
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      email,
      resetPasswordToken: tokenHash,
      resetPasswordExpires: { $gt: new Date() }
    }).select('+password +resetPasswordToken +resetPasswordExpires');

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    user.password = password;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    await user.save();

    await RefreshToken.updateMany({ user: user._id, revokedAt: null }, { revokedAt: new Date() });
    audit('password_reset_completed', { userId: user._id.toString(), email: user.email });

    return res.status(200).json({ message: 'Password reset successful' });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  forgotPassword,
  login,
  logout,
  refresh,
  register,
  resetPassword
};
