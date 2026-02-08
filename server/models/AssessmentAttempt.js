const mongoose = require('mongoose');

const AssessmentAttemptSchema = new mongoose.Schema(
  {
    assessmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Assessment', required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
    score: { type: Number, required: true },
    total: { type: Number, required: true },
    percent: { type: Number, required: true },
    feedback: { type: String, default: '' },
    timeSpentSec: { type: Number, default: 0 },
    submittedAt: { type: Date, default: Date.now },

    answers: [
      {
        questionId: { type: mongoose.Schema.Types.ObjectId, required: true },
        selectedIndex: { type: Number, default: null },
        correctIndex: { type: Number, required: true },
        isCorrect: { type: Boolean, default: false },
        points: { type: Number, default: 0 },
      }
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('AssessmentAttempt', AssessmentAttemptSchema);
