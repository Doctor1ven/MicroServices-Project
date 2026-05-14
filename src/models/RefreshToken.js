const crypto = require('crypto');
const mongoose = require('mongoose');

const refreshTokenSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }
    },
    revokedAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

refreshTokenSchema.statics.hashToken = function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
};

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);
