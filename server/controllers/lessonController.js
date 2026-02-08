const mongoose = require('mongoose');
const Lesson = require('../models/Lesson');

function cleanUrl(u) {
  return String(u || '').trim();
}

exports.getLessons = async (req, res) => {
  try {
    const list = await Lesson.find().sort({ createdAt: -1 }).lean();
    return res.json({ data: list });
  } catch (err) {
    console.error('GET /lessons error:', err);
    return res.status(500).json({ message: 'Failed to load lessons.' });
  }
};

exports.createLesson = async (req, res) => {
  try {
    const { title, educationalContent, modelUrls, createdBy } = req.body;

    if (!title || !String(title).trim()) {
      return res.status(400).json({ message: 'Lesson title is required.' });
    }

    let createdByObj = null;
    if (createdBy) {
      if (!mongoose.Types.ObjectId.isValid(createdBy)) {
        return res.status(400).json({ message: 'createdBy must be a valid user id.' });
      }
      createdByObj = createdBy;
    }

    const urls = Array.isArray(modelUrls) ? modelUrls.map(cleanUrl).filter(Boolean) : [];

    const created = await Lesson.create({
      title: String(title).trim(),
      educationalContent: String(educationalContent || '').trim(),
      modelUrls: urls,
      createdBy: createdByObj,
    });

    return res.status(201).json({ data: created });
  } catch (err) {
    console.error('POST /lessons error:', err);
    return res.status(500).json({ message: 'Failed to create lesson.' });
  }
};

exports.deleteLesson = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid lesson id.' });
    }

    const deleted = await Lesson.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: 'Lesson not found.' });

    return res.json({ message: 'Deleted successfully.' });
  } catch (err) {
    console.error('DELETE /lessons/:id error:', err);
    return res.status(500).json({ message: 'Failed to delete lesson.' });
  }
};
