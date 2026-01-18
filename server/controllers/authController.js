const bcrypt = require('bcryptjs');
const UserModel = require('../models/User');

const AuditLog = require('../models/AuditLog');

const login = async (req, res) => {
  try {
    const { usernameOrEmail, password } = req.body;

    if (!usernameOrEmail || !password) {
      return res.status(400).json({ message: 'username/email and password are required' });
    }

    const user = await UserModel.findOne({
      $or: [{ username: usernameOrEmail }, { email: usernameOrEmail }],
    });

    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

    try {
      await AuditLog.create({
        action: 'Login',
        targetUser: user._id,
        targetEmail: user.email,
        actorUser: user._id,
        actorName: `${user.fname || ''} ${user.lname || ''}`.trim(),
        actorRole: user.role || 'User',
        details: 'User logged in successfully',
      });
    } catch (logErr) {
      console.error('AuditLog(Login) error:', logErr);
    }

    return res.json({
      message: 'Login successful',
      data: {
        user: {
          _id: user._id,
          fname: user.fname,
          lname: user.lname,
          dob: user.dob,
          gender: user.gender,
          number: user.number,
          username: user.username,
          email: user.email,
        },
        token: null,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

const changePassword = async (req, res) => {
  try {
    const { userId, currentPassword, newPassword } = req.body;

    if (!userId || !currentPassword || !newPassword) {
      return res.status(400).json({ message: 'userId, currentPassword, and newPassword are required' });
    }

    const user = await UserModel.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const ok = await bcrypt.compare(currentPassword, user.password);
    if (!ok) return res.status(401).json({ message: 'Current password is incorrect' });

    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'New password must be at least 8 characters long' });
    }

    const specialCharRegex = /[!@#$%^&*]/;
    if (!specialCharRegex.test(newPassword)) {
      return res.status(400).json({ message: 'New password must contain at least one special character' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    try {
      await AuditLog.create({
        action: 'Password Change',
        targetUser: user._id,
        targetEmail: user.email,
        actorUser: user._id,
        actorName: `${user.fname || ''} ${user.lname || ''}`.trim(),
        actorRole: user.role || 'User',
        details: 'User changed password',
      });
    } catch (logErr) {
      console.error('AuditLog(Password Change) error:', logErr);
    }

    return res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('Change password error:', err);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

module.exports = {
  login,
  changePassword,
};
