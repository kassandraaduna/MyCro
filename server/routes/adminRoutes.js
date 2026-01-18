const express = require('express');
const router = express.Router();
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

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { active },
      { new: true }
    );

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
          ? `Activated user account: ${user.email}`
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
    const logs = await AuditLog.find()
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return res.json(logs);
  } catch (err) {
    console.error('GET /admin/logs error:', err);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

module.exports = router;
