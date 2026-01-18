const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema(
  {
    action: { type: String, required: true },

    actorUser: { type: mongoose.Schema.Types.ObjectId, ref: 'accounts' },
    actorName: { type: String },
    actorRole: { type: String },

    targetUser: { type: mongoose.Schema.Types.ObjectId, ref: 'accounts' },
    targetEmail: { type: String },

    details: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('audit_logs', AuditLogSchema);
