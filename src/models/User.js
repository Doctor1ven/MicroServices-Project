const bcrypt = require('bcrypt');
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false
    },
    role: {
      type: String,
      enum: ['admin', 'user'],
      default: 'user'
    },
    failedLoginAttempts: {
      type: Number,
      default: 0,
      min: 0
    },
    lockUntil: {
      type: Date,
      default: null
    },
    resetPasswordToken: {
      type: String,
      select: false,
      default: null
    },
    resetPasswordExpires: {
      type: Date,
      select: false,
      default: null
    }
  },
  { timestamps: true }
);

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) {
    return next();
  }

  this.password = await bcrypt.hash(this.password, 12);
  return next();
});

userSchema.methods.comparePassword = function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.isLocked = function isLocked() {
  return Boolean(this.lockUntil && this.lockUntil > new Date());
};

userSchema.methods.toJSON = function toJSON() {
  const user = this.toObject();
  delete user.password;
  delete user.resetPasswordToken;
  delete user.resetPasswordExpires;
  delete user.__v;
  user.isLocked = Boolean(user.lockUntil && user.lockUntil > new Date());
  return user;
};

module.exports = mongoose.model('User', userSchema);
