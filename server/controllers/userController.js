const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const UserModel = require('../models/User');

const AuditLog = require('../models/AuditLog');

const getMeds = async (req, res) => {
  try {
    const users = await UserModel.find().lean();
    return res.json(users);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

const getMedById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid id' });
    }

    const user = await UserModel.findById(id).lean();
    if (!user) return res.status(404).json({ error: 'Not found' });

    return res.json(user);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

const createMed = async (req, res) => {
  try {
    const { fname, lname, dob, gender, number, username, password, email } = req.body;

    if (!fname || !lname || !dob || !gender || !number || !username || !password || !email) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const existing = await UserModel.findOne({
      $or: [{ username }, { email }],
    }).lean();

    if (existing) {
      return res.status(409).json({ error: 'username or email already exists' });
    }

    const dobDate = new Date(dob);
    if (Number.isNaN(dobDate.getTime())) {
      return res.status(400).json({ error: 'Invalid Date of Birth' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await UserModel.create({
      fname: String(fname).trim(),
      lname: String(lname).trim(),
      dob: dobDate,
      gender: String(gender).trim(),
      number: String(number).trim(),
      username: String(username).trim(),
      password: hashedPassword,
      email: String(email).trim().toLowerCase(),
    });

    try {
      await AuditLog.create({
        action: 'Registration',
        targetUser: newUser._id,
        targetEmail: newUser.email,
        actorUser: newUser._id,
        actorName: `${newUser.fname || ''} ${newUser.lname || ''}`.trim(),
        actorRole: newUser.role || 'User',
        details: 'New account registered',
      });
    } catch (logErr) {
      console.error('AuditLog(Registration) error:', logErr);
      // do not block register
    }

    const safeUser = newUser.toObject();
    delete safeUser.password;

    return res.status(201).json(safeUser);
  } catch (err) {
    console.error('Error creating user:', err);

    if (err?.name === 'ValidationError') {
      return res.status(400).json({ error: err.message });
    }

    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

const updateMed = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid id' });
    }

    const updates = { ...req.body };

    if (updates.password) {
      return res.status(400).json({ error: 'Use /api/auth/change-password to update password.' });
    }

    if (updates.dob) {
      const dobDate = new Date(updates.dob);
      if (Number.isNaN(dobDate.getTime())) {
        return res.status(400).json({ error: 'Invalid Date of Birth' });
      }
      updates.dob = dobDate;
    }

    if (updates.email) updates.email = String(updates.email).trim().toLowerCase();
    if (updates.fname) updates.fname = String(updates.fname).trim();
    if (updates.lname) updates.lname = String(updates.lname).trim();
    if (updates.username) updates.username = String(updates.username).trim();
    if (updates.gender) updates.gender = String(updates.gender).trim();
    if (updates.number) updates.number = String(updates.number).trim();
     if (updates.address !== undefined) {
      updates.address = String(updates.address).trim();
    }

    const updated = await UserModel.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    }).lean();

    if (!updated) return res.status(404).json({ error: 'Not found' });

    if (updated.password) delete updated.password;

    return res.json(updated);
  } catch (err) {
    console.error(err);

    if (err?.name === 'ValidationError') {
      return res.status(400).json({ error: err.message });
    }

    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

const deleteMed = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid id' });
    }

    const deleted = await UserModel.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ error: 'Not found' });

    return res.json({ message: 'Deleted successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports = {
  getMeds,
  getMedById,
  createMed,
  updateMed,
  deleteMed,
};
