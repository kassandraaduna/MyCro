const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const Lesson = require('../models/Lesson');
const upload = require('../utils/upload');

router.get('/lessons', async (req, res) => {
  try {
    const includeArchived = String(req.query.includeArchived) === 'true';
    const filter = includeArchived ? {} : { isArchived: { $ne: true } };

    const list = await Lesson.find(filter).sort({ createdAt: -1 });
    res.json({ data: list });
  } catch (e) {
    res.status(500).json({ message: 'Failed to load lessons.' });
  }
});

router.post('/lessons', upload.array('models', 10), async (req, res) => {
  try {
    const { title, educationalContent, createdBy } = req.body;
    if (!title) return res.status(400).json({ message: 'Title required.' });

    const files = Array.isArray(req.files) ? req.files : [];
    const urls = files.map(f => `/uploads/${f.filename}`);

    const created = await Lesson.create({
      title: title.trim(),
      educationalContent: String(educationalContent || '').trim(),
      modelUrls: urls,
      createdBy: createdBy || null,
    });

    res.status(201).json({ data: created });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message || 'Failed to create lesson.' });
  }
});

router.put('/lessons/:id', upload.array('models', 10), async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid lesson id.' });
    }

    const lesson = await Lesson.findById(id);
    if (!lesson) return res.status(404).json({ message: 'Lesson not found.' });

    const { title, educationalContent, isArchived } = req.body;

    if (title !== undefined) lesson.title = title.trim();
    if (educationalContent !== undefined) lesson.educationalContent = educationalContent.trim();
    if (typeof isArchived !== 'undefined') {
      lesson.isArchived = !!isArchived;
      lesson.archivedAt = isArchived ? new Date() : null;
    }

    const files = Array.isArray(req.files) ? req.files : [];
    if (files.length) {
      lesson.modelUrls.push(...files.map(f => `/uploads/${f.filename}`));
    }

    await lesson.save();
    res.json({ data: lesson });
  } catch (e) {
    res.status(500).json({ message: 'Failed to update lesson.' });
  }
});

router.delete('/lessons/:id', async (req, res) => {
  try {
    await Lesson.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted successfully.' });
  } catch {
    res.status(500).json({ message: 'Delete failed.' });
  }
});

module.exports = router;
