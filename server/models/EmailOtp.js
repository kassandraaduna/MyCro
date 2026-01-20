const mongoose = require('mongoose');

const EmailOtpSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    purpose: { type: String, default: 'register' },

    codeHash: { type: String, required: true },

    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 3 },
    used: { type: Boolean, default: false },

    expiresAt: { type: Date, required: true },

    lastSentAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

EmailOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

EmailOtpSchema.index({ email: 1, purpose: 1, lastSentAt: -1 });

module.exports = mongoose.model('email_otps', EmailOtpSchema);
