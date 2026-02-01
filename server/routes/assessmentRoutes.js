const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Assessment = require('../models/Assessment');

router.get('/assessments', async (req, res) => {
  try {
    const list = await Assessment.find().sort({ createdAt: -1 });
    return res.json({ data: list });
  } catch (err) {
    console.error('GET /assessments error:', err);
    return res.status(500).json({ message: 'Failed to load assessments.' });
  }
});

router.post('/assessments', async (req, res) => {
  try {
    const { title, timer, questions, feedbackRanges, createdBy } = req.body;

    if (!title || !String(title).trim()) {
      return res.status(400).json({ message: 'Quiz title is required.' });
    }

    const timerEnabled = !!timer?.enabled;
    const timerMinutes = timerEnabled ? Number(timer?.minutes) : null;
    if (timerEnabled && (!Number.isFinite(timerMinutes) || timerMinutes <= 0)) {
      return res.status(400).json({ message: 'Timer minutes must be > 0 when timer is enabled.' });
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ message: 'At least 1 question is required.' });
    }

    for (let i = 0; i < questions.length; i += 1) {
      const q = questions[i];

      if (!q?.text || !String(q.text).trim()) {
        return res.status(400).json({ message: `Question #${i + 1}: text is required.` });
      }

      const pts = Number(q.points);
      if (!Number.isFinite(pts) || pts <= 0) {
        return res.status(400).json({ message: `Question #${i + 1}: points must be > 0.` });
      }

      if (!Array.isArray(q.options) || q.options.filter(o => String(o || '').trim()).length < 2) {
        return res.status(400).json({ message: `Question #${i + 1}: need at least 2 choices.` });
      }

      const ci = Number(q.correctIndex);
      if (!Number.isInteger(ci) || ci < 0 || ci >= q.options.length) {
        return res.status(400).json({ message: `Question #${i + 1}: invalid correct answer index.` });
      }

      if (!String(q.options[ci] || '').trim()) {
        return res.status(400).json({ message: `Question #${i + 1}: correct answer is blank.` });
      }
    }

    const cleanedRanges = Array.isArray(feedbackRanges) ? feedbackRanges : [];
    for (let r = 0; r < cleanedRanges.length; r += 1) {
      const rr = cleanedRanges[r];
      const min = Number(rr.min);
      const max = Number(rr.max);

      if (!Number.isFinite(min) || !Number.isFinite(max) || min < 0 || max > 100 || min > max) {
        return res
          .status(400)
          .json({ message: `Feedback range #${r + 1} is invalid (0-100 and min<=max).` });
      }

      if (!rr.message || !String(rr.message).trim()) {
        return res.status(400).json({ message: `Feedback range #${r + 1}: message is required.` });
      }
    }

    let createdByObj = null;
    if (createdBy) {
      if (!mongoose.Types.ObjectId.isValid(createdBy)) {
        return res.status(400).json({ message: 'createdBy must be a valid user id.' });
      }
      createdByObj = createdBy;
    }

    const created = await Assessment.create({
      title: String(title).trim(),
      timer: {
        enabled: timerEnabled,
        minutes: timerEnabled ? timerMinutes : null,
      },
      questions: questions.map((q) => ({
        text: String(q.text).trim(),
        points: Number(q.points),
        options: q.options.map((o) => String(o || '').trim()),
        correctIndex: Number(q.correctIndex),
      })),
      feedbackRanges: cleanedRanges.map((r) => ({
        min: Number(r.min),
        max: Number(r.max),
        message: String(r.message || '').trim(),
      })),
      createdBy: createdByObj,
    });

    return res.status(201).json({ data: created });
  } catch (err) {
    console.error('POST /assessments error:', err);
    return res.status(500).json({ message: 'Failed to create assessment.' });
  }
});

router.delete('/assessments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Assessment.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: 'Assessment not found.' });
    return res.json({ message: 'Deleted successfully.' });
  } catch (err) {
    console.error('DELETE /assessments/:id error:', err);
    return res.status(500).json({ message: 'Failed to delete assessment.' });
  }
});

router.get('/assessments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const a = await Assessment.findById(id);
    if (!a) return res.status(404).json({ message: 'Assessment not found.' });
    return res.json({ data: a });
  } catch (err) {
    console.error('GET /assessments/:id error:', err);
    return res.status(500).json({ message: 'Failed to load assessment.' });
  }
});

router.post('/assessments/:id/submit', async (req, res) => {
  try {
    const { id } = req.params;
    const { answers } = req.body; 
    const a = await Assessment.findById(id);
    if (!a) return res.status(404).json({ message: 'Assessment not found.' });

    const qs = Array.isArray(a.questions) ? a.questions : [];
    const ansArr = Array.isArray(answers) ? answers : [];

    const ansMap = {};
    for (const item of ansArr) {
      if (item?.questionId) ansMap[String(item.questionId)] = item.selectedIndex;
    }

    let score = 0;
    let total = 0;

    for (const q of qs) {
      const pts = Number(q.points || 0);
      total += pts;

      const selected = ansMap[String(q._id)];
      const selectedIndex = Number(selected);

      if (Number.isInteger(selectedIndex) && selectedIndex === Number(q.correctIndex)) {
        score += pts;
      }
    }

    const percent = total > 0 ? Math.round((score / total) * 100) : 0;

    let feedback = 'No feedback configured.';
    const ranges = Array.isArray(a.feedbackRanges) ? a.feedbackRanges : [];
    const found = ranges.find(r => percent >= Number(r.min) && percent <= Number(r.max));
    if (found?.message) feedback = found.message;

    return res.json({
      data: { score, total, percent, feedback }
    });
  } catch (err) {
    console.error('POST /assessments/:id/submit error:', err);
    return res.status(500).json({ message: 'Failed to submit assessment.' });
  }
});


module.exports = router;
