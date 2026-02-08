const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const Assessment = require('../models/Assessment');
const AssessmentAttempt = require('../models/AssessmentAttempt');

const User = require('../models/User');

router.get('/assessments', async (req, res) => {
  try {
    const includeArchived = String(req.query.includeArchived || '').toLowerCase() === 'true';
    const filter = includeArchived ? {} : { isArchived: { $ne: true } };

    const list = await Assessment.find(filter).sort({ createdAt: -1 });
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

      isArchived: false,
      archivedAt: null,
    });

    return res.status(201).json({ data: created });
  } catch (err) {
    console.error('POST /assessments error:', err);
    return res.status(500).json({ message: 'Failed to create assessment.' });
  }
});

router.put('/assessments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, timer, questions, feedbackRanges } = req.body;

    const a = await Assessment.findById(id);
    if (!a) return res.status(404).json({ message: 'Assessment not found.' });

    if (title !== undefined) {
      if (!String(title || '').trim()) return res.status(400).json({ message: 'Title cannot be empty.' });
      a.title = String(title).trim();
    }

    if (timer !== undefined) {
      const enabled = !!timer?.enabled;
      const mins = enabled ? Number(timer?.minutes) : null;
      if (enabled && (!Number.isFinite(mins) || mins <= 0)) {
        return res.status(400).json({ message: 'Timer minutes must be > 0 when enabled.' });
      }
      a.timer = { enabled, minutes: enabled ? mins : null };
    }

    if (questions !== undefined) {
      if (!Array.isArray(questions) || questions.length === 0) {
        return res.status(400).json({ message: 'At least 1 question is required.' });
      }
      a.questions = questions.map((q) => ({
        text: String(q.text || '').trim(),
        points: Number(q.points || 1),
        options: Array.isArray(q.options) ? q.options.map(o => String(o || '').trim()) : [],
        correctIndex: Number(q.correctIndex || 0),
      }));
    }

    if (feedbackRanges !== undefined) {
      const ranges = Array.isArray(feedbackRanges) ? feedbackRanges : [];
      a.feedbackRanges = ranges.map((r) => ({
        min: Number(r.min),
        max: Number(r.max),
        message: String(r.message || '').trim(),
      }));
    }

    const saved = await a.save();
    return res.json({ data: saved });
  } catch (err) {
    console.error('PUT /assessments/:id error:', err);
    return res.status(500).json({ message: 'Failed to update assessment.' });
  }
});

router.delete('/assessments/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await Assessment.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: 'Assessment not found.' });

    await AssessmentAttempt.deleteMany({ assessmentId: id });

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

router.put('/assessments/:id/archive', async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await Assessment.findByIdAndUpdate(
      id,
      { isArchived: true, archivedAt: new Date() },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: 'Assessment not found.' });
    return res.json({ data: updated });
  } catch (err) {
    console.error('PUT /assessments/:id/archive error:', err);
    return res.status(500).json({ message: 'Failed to archive assessment.' });
  }
});

router.put('/assessments/:id/restore', async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await Assessment.findByIdAndUpdate(
      id,
      { isArchived: false, archivedAt: null },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: 'Assessment not found.' });
    return res.json({ data: updated });
  } catch (err) {
    console.error('PUT /assessments/:id/restore error:', err);
    return res.status(500).json({ message: 'Failed to restore assessment.' });
  }
});

router.post('/assessments/:id/submit', async (req, res) => {
  try {
    const { id } = req.params;
    const { answers, studentId, timeSpentSec } = req.body;

    const a = await Assessment.findById(id);
    if (!a) return res.status(404).json({ message: 'Assessment not found.' });
    if (a.isArchived) {
      return res.status(403).json({ message: 'This assessment is archived and no longer available.' });
    }
    if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ message: 'studentId is required and must be a valid user id.' });
    }

    const qs = Array.isArray(a.questions) ? a.questions : [];
    const ansArr = Array.isArray(answers) ? answers : [];

    const ansMap = {};
    for (const item of ansArr) {
      if (item?.questionId) ansMap[String(item.questionId)] = item.selectedIndex;
    }

    let score = 0;
    let total = 0;
    const answersToSave = [];

    for (const q of qs) {
      const pts = Number(q.points || 0);
      total += pts;

      const selected = ansMap[String(q._id)];
      const selectedIndex = Number(selected);

      const isCorrect = Number.isInteger(selectedIndex) && selectedIndex === Number(q.correctIndex);
      if (isCorrect) score += pts;

      answersToSave.push({
        questionId: q._id,
        selectedIndex: Number.isInteger(selectedIndex) ? selectedIndex : null,
        correctIndex: Number(q.correctIndex),
        isCorrect,
        points: pts,
      });
    }

    const percent = total > 0 ? Math.round((score / total) * 100) : 0;

    let feedback = 'No feedback configured.';
    const ranges = Array.isArray(a.feedbackRanges) ? a.feedbackRanges : [];
    const found = ranges.find(r => percent >= Number(r.min) && percent <= Number(r.max));
    if (found?.message) feedback = found.message;

    const attempt = await AssessmentAttempt.create({
      assessmentId: a._id,
      studentId,
      score,
      total,
      percent,
      feedback,
      timeSpentSec: Number.isFinite(Number(timeSpentSec)) ? Number(timeSpentSec) : 0,
      answers: answersToSave,
      submittedAt: new Date(),
    });

    return res.json({
      data: {
        score, total, percent, feedback,
        attemptId: attempt._id,
        submittedAt: attempt.submittedAt,
      }
    });
  } catch (err) {
    console.error('POST /assessments/:id/submit error:', err);
    return res.status(500).json({ message: 'Failed to submit assessment.' });
  }
});

router.get('/instructor/assessment-monitoring', async (req, res) => {
  try {
    const students = await User.find({ role: { $in: ['student', 'user'] } 
    }) 
      .select('_id fname lname username email role')
      .lean();

    if (!students.length) {
      return res.json({ data: [] });
    }

    const studentIds = students.map(s => s._id);

    const agg = await AssessmentAttempt.aggregate([
      { $match: { studentId: { $in: studentIds } } },
      {
        $group: {
          _id: { studentId: '$studentId', assessmentId: '$assessmentId' },
          takeCount: { $sum: 1 },
          lastSubmittedAt: { $max: '$submittedAt' },
        }
      },
      {
        $lookup: {
          from: 'assessmentattempts',
          let: { sid: '$_id.studentId', aid: '$_id.assessmentId', lastAt: '$lastSubmittedAt' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$studentId', '$$sid'] },
                    { $eq: ['$assessmentId', '$$aid'] },
                    { $eq: ['$submittedAt', '$$lastAt'] },
                  ]
                }
              }
            },
            { $project: { percent: 1, score: 1, total: 1, submittedAt: 1 } }
          ],
          as: 'lastAttempt'
        }
      },
      { $unwind: { path: '$lastAttempt', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'assessments',
          localField: '_id.assessmentId',
          foreignField: '_id',
          as: 'assessment'
        }
      },
      { $unwind: { path: '$assessment', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          studentId: '$_id.studentId',
          assessmentId: '$_id.assessmentId',
          title: '$assessment.title',
          takeCount: 1,
          lastPercent: '$lastAttempt.percent',
          lastScore: '$lastAttempt.score',
          lastTotal: '$lastAttempt.total',
          lastSubmittedAt: '$lastAttempt.submittedAt',
        }
      }
    ]);

    const byStudent = new Map();
    for (const row of agg) {
      const sid = String(row.studentId);
      if (!byStudent.has(sid)) byStudent.set(sid, []);
      byStudent.get(sid).push(row);
    }

    const out = students.map(s => {
      const name = `${s.fname || ''} ${s.lname || ''}`.trim() || s.username || s.email || 'student';
      return {
        studentId: s._id,
        studentName: name,
        assessments: byStudent.get(String(s._id)) || [],
      };
    });

    return res.json({ data: out });
  } catch (err) {
    console.error('GET /instructor/assessment-monitoring error:', err);
    return res.status(500).json({ message: 'Failed to load monitoring data.' });
  }
});

router.get('/instructor/assessments/:id/attempts', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid assessment id.' });
    }

    const attempts = await AssessmentAttempt.find({ assessmentId: id })
      .sort({ submittedAt: -1 })
      .lean();

    const studentIds = [...new Set(attempts.map(a => String(a.studentId)).filter(Boolean))];

    const students = await User.find({ _id: { $in: studentIds } })
      .select('_id fname lname username email')
      .lean();

    const map = new Map(students.map(s => [String(s._id), s]));

    const out = attempts.map(a => {
      const s = map.get(String(a.studentId));
      const name = s ? (`${s.fname || ''} ${s.lname || ''}`.trim() || s.username || s.email) : 'Unknown';
      return {
        attemptId: a._id,
        studentId: a.studentId,
        studentName: name,
        score: a.score,
        total: a.total,
        percent: a.percent,
        feedback: a.feedback,
        submittedAt: a.submittedAt,
        timeSpentSec: a.timeSpentSec || 0,
      };
    });

    return res.json({ data: out });
  } catch (err) {
    console.error('GET /instructor/assessments/:id/attempts error:', err);
    return res.status(500).json({ message: 'Failed to load attempts.' });
  }
});



module.exports = router;
