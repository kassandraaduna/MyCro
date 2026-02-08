const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  points: { type: Number, required: true, default: 1 },
  options: { type: [String], required: true, default: [] },
  correctIndex: { type: Number, required: true, default: 0 },
});

const FeedbackRangeSchema = new mongoose.Schema({
  min: { type: Number, required: true },
  max: { type: Number, required: true },
  message: { type: String, required: true },
});

const AssessmentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    timer: {
      enabled: { type: Boolean, default: false },
      minutes: { type: Number, default: null },
    },
    questions: { type: [QuestionSchema], default: [] },
    feedbackRanges: { type: [FeedbackRangeSchema], default: [] },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'accounts', default: null },
    isArchived: { type: Boolean, default: false },
    archivedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Assessment', AssessmentSchema);
