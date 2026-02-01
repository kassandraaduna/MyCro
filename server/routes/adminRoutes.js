const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

const getActor = (req) => {
  const body = req.body || {};
  const actorUser = body.actorUser || null;
  const actorName = body.actorName || 'Admin';
  const actorRole = body.actorRole || 'admin';
  return { actorUser, actorName, actorRole };
};

router.get('/users', async (req, res) => {
  try {
    const users = await User.find({ role: { $ne: 'admin' } }).lean();
    return res.json(users);
  } catch (err) {
    console.error('GET /admin/users error:', err);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

router.post('/instructors', async (req, res) => {
  try {
    const {
      fname,
      lname,
      dob,
      gender,
      number,
      username,
      email,
      tempPassword,
      details,
    } = req.body;

    const actor = getActor(req);

    if (!fname || !lname || !dob || !gender || !number || !username || !email || !tempPassword) {
      return res.status(400).json({
        message:
          'fname, lname, dob, gender, number, username, email, and tempPassword are required',
      });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanUsername = String(username).trim();

    const existing = await User.findOne({
      $or: [{ email: cleanEmail }, { username: cleanUsername }],
    }).lean();

    if (existing) {
      return res.status(409).json({ message: 'Email or username already exists.' });
    }

    if (String(tempPassword).length < 8) {
      return res.status(400).json({ message: 'Temp password must be at least 8 characters long' });
    }
    if (!/[!@#$%^&*]/.test(String(tempPassword))) {
      return res.status(400).json({ message: 'Temp password must include a special character.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(String(tempPassword), salt);

    const newInstructor = await User.create({
      fname: String(fname).trim(),
      lname: String(lname).trim(),
      dob,
      gender: String(gender).trim(),
      number: String(number).trim(),
      username: cleanUsername,
      email: cleanEmail,
      password: hashedPassword,
      role: 'instructor',
      active: true,

      mustChangePassword: true,
      passwordTemp: true,

      mfaLastVerifiedAt: null,

      failedLoginAttempts: 0,
      lastFailedLoginAt: null,
    });

    await AuditLog.create({
      action: 'Created instructor account',
      ...actor,
      targetUser: newInstructor._id,
      targetEmail: newInstructor.email,
      details:
        details ||
        `Admin created instructor account: ${newInstructor.email} (must change password on first login)`,
    });

    const safe = newInstructor.toObject();
    delete safe.password;

    return res.status(201).json(safe);
  } catch (err) {
    console.error('POST /admin/instructors error:', err);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

router.put('/users/:id', async (req, res) => {
  try {
    const { fname, lname, email, number, details } = req.body;

    const updated = await User.findByIdAndUpdate(
      req.params.id,
      { fname, lname, email, number },
      { new: true, runValidators: true }
    );

    if (!updated) return res.status(404).json({ message: 'User not found' });

    const actor = getActor(req);

    await AuditLog.create({
      action: 'Updated account',
      ...actor,
      targetUser: updated._id,
      targetEmail: updated.email,
      details: details || `Updated profile fields for ${updated.email}`,
    });

    return res.json(updated);
  } catch (err) {
    console.error('PUT /admin/users/:id error:', err);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

router.put('/users/:id/status', async (req, res) => {
  try {
    const { active, details } = req.body;

    const update = { active: !!active };
    if (active === true) {
      update.failedLoginAttempts = 0;
      update.lastFailedLoginAt = null;
    }

    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true });

    if (!user) return res.status(404).json({ message: 'User not found' });

    const actor = getActor(req);

    await AuditLog.create({
      action: active ? 'Activated account' : 'Deactivated account',
      ...actor,
      targetUser: user._id,
      targetEmail: user.email,
      details:
        details ||
        (active
          ? `Activated user account: ${user.email} (attempts reset)`
          : `Deactivated user account: ${user.email}`),
    });

    return res.json({ success: true });
  } catch (err) {
    console.error('PUT /admin/users/:id/status error:', err);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

router.delete('/users/:id', async (req, res) => {
  try {
    const { details } = req.body || {};

    const user = await User.findByIdAndDelete(req.params.id);
    const actor = getActor(req);

    await AuditLog.create({
      action: 'Deleted account',
      ...actor,
      targetUser: user?._id,
      targetEmail: user?.email,
      details: details || `Deleted user account: ${user?.email || '(unknown)'}`,
    });

    return res.json({ success: true });
  } catch (err) {
    console.error('DELETE /admin/users/:id error:', err);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

router.get('/logs', async (req, res) => {
  try {
    const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(100).lean();
    return res.json(logs);
  } catch (err) {
    console.error('GET /admin/logs error:', err);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

module.exports = router;
