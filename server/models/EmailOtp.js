const mongoose = require('mongoose');

const EmailOtpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    purpose: {
      type: String,
      required: true,
      enum: ['register', 'login_mfa', 'reset_password'],
      default:  'register',
      index: true,
    },

    codeHash: { 
      type: String, 
      required: true, 
    },

    attempts: { 
      type: Number, 
      default: 0, 
    },

    maxAttempts: { 
      type: Number, 
      default: 3, 
    },

    used: { 
      type: Boolean, 
      default: false,
      index: true, 
    },

    expiresAt: { 
      type: Date, 
      required: true,
      index: true,
    },

    lastSentAt: { 
      type: Date, 
      default: Date.now, 
    },
  },
  { timestamps: true }
);

EmailOtpSchema.index({ email: 1, purpose: 1, used: 1, expiresAt: 1 });

module.exports = mongoose.model('EmailOtp', EmailOtpSchema);
