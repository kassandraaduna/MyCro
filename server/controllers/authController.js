const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const UserModel = require('../models/User');
const AuditLog = require('../models/AuditLog');
const EmailOtp = require('../models/EmailOtp');

const OTP_EXP_MINUTES = Number(process.env.OTP_EXP_MINUTES || 10);
const RESEND_COOLDOWN_SECONDS = 60;

const MFA_INTERVAL_DAYS = Number(process.env.MFA_INTERVAL_DAYS || 15);

const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;

const maskEmail = (email) => {
  const [name, domain] = String(email).split('@');
  if (!domain) return email;
  return `${name.slice(0, 2)}***@${domain}`;
};

const makeOtpCode = () => String(Math.floor(100000 + Math.random() * 900000));

const makeTransporter = () => {
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
    throw new Error('Missing GMAIL credentials in .env');
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_APP_PASSWORD,
    },
  });
};

const sendOtpEmail = async (email, code, subject = 'Your Verification Code') => {
  const transporter = makeTransporter();
  await transporter.sendMail({
    from: GMAIL_USER,
    to: email,
    subject,
    text: `Your verification code is: ${code}\n\nExpires in ${OTP_EXP_MINUTES} minutes.`,
  });
};

const enforceCooldown = async (email, purpose, messagePrefix) => {
  const lastOtp = await EmailOtp.findOne({ email, purpose }).sort({ lastSentAt: -1 });
  if (lastOtp?.lastSentAt) {
    const diffSeconds = (Date.now() - lastOtp.lastSentAt.getTime()) / 1000;
    if (diffSeconds < RESEND_COOLDOWN_SECONDS) {
      const wait = Math.ceil(RESEND_COOLDOWN_SECONDS - diffSeconds);
      return { blocked: true, wait, message: `${messagePrefix} ${wait} seconds.` };
    }
  }
  return { blocked: false };
};

const isMfaDue = (lastVerifiedAt) => {
  if (!lastVerifiedAt) return true;
  const ms = MFA_INTERVAL_DAYS * 24 * 60 * 60 * 1000;
  return Date.now() - new Date(lastVerifiedAt).getTime() >= ms;
};

const buildSafeUser = (user) => ({
  _id: user._id,
  fname: user.fname,
  lname: user.lname,
  dob: user.dob,
  gender: user.gender,
  number: user.number,
  username: user.username,
  email: user.email,
  role: user.role,
  active: user.active,
  mustChangePassword: !!user.mustChangePassword, 
});

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

    if (user.active === false) {
      return res.status(403).json({ message: 'Account is deactivated. Please contact admin.' });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

    if (isMfaDue(user.mfaLastVerifiedAt)) {
      const purpose = 'login_mfa';

      const cooldown = await enforceCooldown(user.email, purpose, 'Please wait');
      if (cooldown.blocked) {
        return res.status(429).json({ message: cooldown.message });
      }

      await EmailOtp.updateMany({ 
        email: user.email, 
        purpose, 
        used: false }, { used: true }
      );

      const code = makeOtpCode();
      const codeHash = await bcrypt.hash(code, 10);
      const expiresAt = new Date(Date.now() + OTP_EXP_MINUTES * 60 * 1000);

      const otpDoc = await EmailOtp.create({
        email: user.email,
        purpose,
        codeHash,
        attempts: 0,
        maxAttempts: 3,
        used: false,
        expiresAt,
        lastSentAt: new Date(),
      });

      await sendOtpEmail(user.email, code, 'Your Login Verification Code');

      return res.json({
        message: 'OTP required',
        mfaRequired: true,
        otpId: otpDoc._id,
        maskedEmail: maskEmail(user.email),
        email: user.email,
        expiresAt: otpDoc.expiresAt,
      });
    }

    try {
      await AuditLog.create({
        action: 'Login',
        targetUser: user._id,
        targetEmail: user.email,
        actorUser: user._id,
        actorName: `${user.fname || ''} ${user.lname || ''}`.trim(),
        actorRole: user.role || 'user',
        details: 'User logged in successfully',
      });
    } catch (logErr) {
      console.error('AuditLog(Login) error:', logErr);
    }

    return res.json({
      message: 'Login successful',
      data: {
        user: buildSafeUser(user),
        token: null,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

const verifyLoginOtp = async (req, res) => {
  try {
    const { otpId, code } = req.body;

    if (!otpId || !code) {
      return res.status(400).json({ message: 'otpId and code are required' });
    }

    const otpDoc = await EmailOtp.findOne({
      _id: otpId,
      purpose: 'login_mfa',
      used: false,
    });
    if (!otpDoc) return res.status(400).json({ message: 'OTP expired or invalid.' });
    if (otpDoc.expiresAt < new Date()) return res.status(400).json({ message: 'OTP expired.' });    

    if (otpDoc.purpose !== 'login_mfa') {
      return res.status(400).json({ message: 'Invalid OTP purpose.' });
    }

    if (otpDoc.attempts >= otpDoc.maxAttempts) {
      return res.status(429).json({ message: 'Too many attempts. Please resend code.' });
    }

    const isValid = await bcrypt.compare(String(code).trim(), otpDoc.codeHash);
    if (!isValid) {
      otpDoc.attempts += 1;
      await otpDoc.save();

      return res.status(400).json({
        message: `Invalid code. Attempts left: ${otpDoc.maxAttempts - otpDoc.attempts}`,
      });
    }

    otpDoc.used = true;
    await otpDoc.save();

    const user = await UserModel.findOne({ email: otpDoc.email });
    if (!user) return res.status(404).json({ message: 'User not found.' });

    if (user.active === false) {
      return res.status(403).json({ message: 'Account is deactivated. Please contact admin.' });
    }

    user.mfaLastVerifiedAt = new Date();
    await user.save();

    try {
      await AuditLog.create({
        action: 'Login (OTP Verified)',
        targetUser: user._id,
        targetEmail: user.email,
        actorUser: user._id,
        actorName: `${user.fname || ''} ${user.lname || ''}`.trim(),
        actorRole: user.role || 'user',
        details: 'User verified login OTP and logged in',
      });
    } catch (logErr) {
      console.error('AuditLog(Login OTP) error:', logErr);
    }

    return res.json({
      message: 'Login successful',
      data: {
        user: buildSafeUser(user),
        token: null,
      },
    });
  } catch (err) {
    console.error('verifyLoginOtp error:', err);
    return res.status(500).json({ message: 'Verification failed' });
  }
};

const resendLoginOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'email is required' });

    const cleanEmail = email.trim().toLowerCase();
    const purpose = 'login_mfa';

    const user = await UserModel.findOne({ email: cleanEmail }).lean();
    if (!user) return res.status(404).json({ message: 'Email not found.' });

    if (user.active === false) {
      return res.status(403).json({ message: 'Account is deactivated. Please contact admin.' });
    }

    const cooldown = await enforceCooldown(cleanEmail, purpose, 'Please wait');
    if (cooldown.blocked) return res.status(429).json({ message: cooldown.message });

    await EmailOtp.updateMany({ 
      email: cleanEmail, 
        purpose: 'login_mfa', 
        used: false },{ used: true }
    );

    const code = makeOtpCode();
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + OTP_EXP_MINUTES * 60 * 1000);

    const otpDoc = await EmailOtp.create({
      email: cleanEmail,
      purpose,
      codeHash,
      attempts: 0,
      maxAttempts: 3,
      used: false,
      expiresAt,
      lastSentAt: new Date(),
    });

    await sendOtpEmail(cleanEmail, code, 'Your Login Verification Code');

    return res.json({
      otpId: otpDoc._id,
      maskedEmail: maskEmail(cleanEmail),
      email: cleanEmail,
      expiresAt: otpDoc.expiresAt,
    });
  } catch (err) {
    console.error('resendLoginOtp error:', err);
    return res.status(500).json({ message: 'Failed to resend code' });
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

    if (newPassword.length < 8) return res.status(400).json({ message: 'New password must be at least 8 characters long' });

    const specialCharRegex = /[!@#$%^&*]/;
    if (!specialCharRegex.test(newPassword)) {
      return res.status(400).json({ message: 'New password must contain at least one special character' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    user.mustChangePassword = false;

    await user.save();

    try {
      await AuditLog.create({
        action: 'Password Change',
        targetUser: user._id,
        targetEmail: user.email,
        actorUser: user._id,
        actorName: `${user.fname || ''} ${user.lname || ''}`.trim(),
        actorRole: user.role || 'user',
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

const requestEmailOtp = async (req, res) => {
  try {
    const { email, purpose } = req.body;
    if (!email) return res.status(400).json({ message: 'email is required' });

    const cleanEmail = email.trim().toLowerCase();
    const realPurpose = purpose || 'register';

    const existingUser = await UserModel.findOne({ email: cleanEmail }).lean();
    if (existingUser) return res.status(409).json({ message: 'Email already registered.' });

    const cooldown = await enforceCooldown(cleanEmail, realPurpose, 'Please wait');
    if (cooldown.blocked) return res.status(429).json({ message: cooldown.message });

    await EmailOtp.updateMany({ 
      email: cleanEmail, 
      purpose: realPurpose, 
      used: false }, { used: true }
    );

    const code = makeOtpCode();
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + OTP_EXP_MINUTES * 60 * 1000);

    const otpDoc = await EmailOtp.create({
      email: cleanEmail,
      purpose: realPurpose,
      codeHash,
      attempts: 0,
      maxAttempts: 3,
      used: false,
      expiresAt,
      lastSentAt: new Date(),
    });

    await sendOtpEmail(cleanEmail, code, 'Your Registration Verification Code');

    return res.json({
      otpId: otpDoc._id,
      maskedEmail: maskEmail(cleanEmail),
      expiresAt: otpDoc.expiresAt,
    });
  } catch (err) {
    console.error('requestEmailOtp error:', err);
    return res.status(500).json({ message: 'Failed to send OTP' });
  }
};

const resendEmailOtp = async (req, res) => {
  try {
    const { email, purpose } = req.body;
    if (!email) return res.status(400).json({ message: 'email is required' });

    const cleanEmail = email.trim().toLowerCase();
    const realPurpose = purpose || 'register';

    const cooldown = await enforceCooldown(cleanEmail, realPurpose, 'Please wait');
    if (cooldown.blocked) return res.status(429).json({ message: cooldown.message });

    const existingUser = await UserModel.findOne({ email: cleanEmail }).lean();
    if (existingUser) return res.status(409).json({ message: 'Email already registered.' });

    const code = makeOtpCode();
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + OTP_EXP_MINUTES * 60 * 1000);

    const otpDoc = await EmailOtp.create({
      email: cleanEmail,
      purpose: realPurpose,
      codeHash,
      attempts: 0,
      maxAttempts: 3,
      used: false,
      expiresAt,
      lastSentAt: new Date(),
    });

    await sendOtpEmail(cleanEmail, code, 'Your Registration Verification Code');

    return res.json({
      otpId: otpDoc._id,
      maskedEmail: maskEmail(cleanEmail),
      expiresAt: otpDoc.expiresAt,
    });
  } catch (err) {
    console.error('resendEmailOtp error:', err);
    return res.status(500).json({ message: 'Failed to resend OTP' });
  }
};

const verifyEmailOtpAndRegister = async (req, res) => {
  try {
    const { otpId, code, medData } = req.body;

    if (!otpId || !code || !medData) {
      return res.status(400).json({ message: 'otpId, code, and medData are required' });
    }

    const otpDoc = await EmailOtp.findById(otpId);
    if (!otpDoc) return res.status(400).json({ message: 'OTP expired or not found.' });
    if (otpDoc.used) return res.status(400).json({ message: 'OTP already used.' });
    if (otpDoc.expiresAt < new Date()) return res.status(400).json({ message: 'OTP expired.' });

    if (otpDoc.attempts >= otpDoc.maxAttempts) {
      return res.status(429).json({ message: 'Too many attempts. Please resend code.' });
    }

    const cleanEmail = String(medData.email || '').trim().toLowerCase();
    if (!cleanEmail || cleanEmail !== otpDoc.email) {
      return res.status(400).json({ message: 'Email mismatch. Please resend code.' });
    }

    const isValid = await bcrypt.compare(String(code).trim(), otpDoc.codeHash);
    if (!isValid) {
      otpDoc.attempts += 1;
      await otpDoc.save();
      return res.status(400).json({
        message: `Invalid code. Attempts left: ${otpDoc.maxAttempts - otpDoc.attempts}`,
      });
    }

    otpDoc.used = true;
    await otpDoc.save();

    const existing = await UserModel.findOne({
      $or: [{ email: cleanEmail }, { username: medData.username }],
    }).lean();

    if (existing) return res.status(409).json({ message: 'username or email already exists' });

    const { fname, lname, dob, gender, number, username, password } = medData;

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await UserModel.create({
      fname: String(fname).trim(),
      lname: String(lname).trim(),
      dob,
      gender: String(gender).trim(),
      number: String(number).trim(),
      username: String(username).trim(),
      email: cleanEmail,
      password: hashedPassword,
      role: 'user',
      active: true,
      mfaLastVerifiedAt: null,
      mustChangePassword: false, 
    });

    await AuditLog.create({
      action: 'Registration',
      targetUser: newUser._id,
      targetEmail: newUser.email,
      actorUser: newUser._id,
      actorName: `${newUser.fname} ${newUser.lname}`.trim(),
      actorRole: 'user',
      details: 'Registered with email OTP',
    });

    const safe = newUser.toObject();
    delete safe.password;

    return res.status(201).json(safe);
  } catch (err) {
    console.error('verifyEmailOtpAndRegister error:', err);
    return res.status(500).json({ message: 'Registration failed' });
  }
};

const requestPasswordResetOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'email is required' });

    const cleanEmail = email.trim().toLowerCase();
    const user = await UserModel.findOne({ email: cleanEmail }).lean();
    if (!user) return res.status(404).json({ message: 'Email not found.' });

    const purpose = 'reset_password';

    const cooldown = await enforceCooldown(cleanEmail, purpose, 'Please wait');
    if (cooldown.blocked) return res.status(429).json({ message: cooldown.message });

    await EmailOtp.updateMany({ 
      email: cleanEmail, 
      purpose, 
      used: false }, { used: true }
    );

    const code = makeOtpCode();
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + OTP_EXP_MINUTES * 60 * 1000);

    const otpDoc = await EmailOtp.create({
      email: cleanEmail,
      purpose,
      codeHash,
      attempts: 0,
      maxAttempts: 3,
      used: false,
      expiresAt,
      lastSentAt: new Date(),
    });

    await sendOtpEmail(cleanEmail, code, 'Your Password Reset Code');

    return res.json({
      otpId: otpDoc._id,
      maskedEmail: maskEmail(cleanEmail),
      expiresAt: otpDoc.expiresAt,
    });
  } catch (err) {
    console.error('requestPasswordResetOtp error:', err);
    return res.status(500).json({ message: 'Failed to send reset OTP' });
  }
};

const resendPasswordResetOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'email is required' });

    const cleanEmail = email.trim().toLowerCase();
    const user = await UserModel.findOne({ email: cleanEmail }).lean();
    if (!user) return res.status(404).json({ message: 'Email not found.' });

    const purpose = 'reset_password';

    const cooldown = await enforceCooldown(cleanEmail, purpose, 'Please wait');
    if (cooldown.blocked) return res.status(429).json({ message: cooldown.message });

    await EmailOtp.updateMany({ 
      email: cleanEmail, 
      purpose, 
      used: false }, { used: true }
    );

    const code = makeOtpCode();
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + OTP_EXP_MINUTES * 60 * 1000);

    const otpDoc = await EmailOtp.create({
      email: cleanEmail,
      purpose,
      codeHash,
      attempts: 0,
      maxAttempts: 3,
      used: false,
      expiresAt,
      lastSentAt: new Date(),
    });

    await sendOtpEmail(cleanEmail, code, 'Your Password Reset Code');

    return res.json({
      otpId: otpDoc._id,
      maskedEmail: maskEmail(cleanEmail),
      expiresAt: otpDoc.expiresAt,
    });
  } catch (err) {
    console.error('resendPasswordResetOtp error:', err);
    return res.status(500).json({ message: 'Failed to resend reset OTP' });
  }
};

const verifyPasswordResetOtp = async (req, res) => {
  try {
    const { otpId, code } = req.body;

    if (!otpId || !code) {
      return res.status(400).json({ message: 'otpId and code are required' });
    }

    const otpDoc = await EmailOtp.findOne({
      _id: otpId,
      purpose: 'reset_password',
      used: false
    });

    if (!otpDoc) return res.status(400).json({ message: 'OTP expired or invalid.' });
    if (otpDoc.expiresAt < new Date()) return res.status(400).json({ message: 'OTP expired.' });
    if (otpDoc.attempts >= otpDoc.maxAttempts) return res.status(429).json({ message: 'Too many attempts. Please resend code.' });

    const isValid = await bcrypt.compare(String(code).trim(), otpDoc.codeHash);
    if (!isValid) {
      otpDoc.attempts += 1;
      await otpDoc.save();
      return res.status(400).json({ message: `Invalid code. Attempts left: ${otpDoc.maxAttempts - otpDoc.attempts}` });
    }

    return res.json({ message: 'OTP verified' });

  } catch (err) {
    console.error('verifyPasswordResetOtp error:', err);
    return res.status(500).json({ message: 'OTP verification failed' });
  }
};

const resetPasswordWithOtp = async (req, res) => {
  try {
    const { otpId, code, newPassword } = req.body;

    if (!otpId || !code || !newPassword) {
      return res.status(400).json({ message: 'otpId, code, and newPassword are required' });
    }

    const otpDoc = await EmailOtp.findOne({
      _id: otpId,
      purpose: 'reset_password',
      used: false
    });

    if (!otpDoc) return res.status(400).json({ message: 'OTP expired or invalid.' });
    if (otpDoc.expiresAt < new Date()) return res.status(400).json({ message: 'OTP expired.' });
    if (otpDoc.attempts >= otpDoc.maxAttempts) return res.status(429).json({ message: 'Too many attempts. Please resend code.' });

    const isValid = await bcrypt.compare(String(code).trim(), otpDoc.codeHash);
    if (!isValid) {
      otpDoc.attempts += 1;
      await otpDoc.save();
      return res.status(400).json({ message: `Invalid code. Attempts left: ${otpDoc.maxAttempts - otpDoc.attempts}` });
    }

    if (newPassword.length < 8) return res.status(400).json({ message: 'New password must be at least 8 characters long' });
    if (!/[!@#$%^&*]/.test(newPassword)) return res.status(400).json({ message: 'New password must contain at least one special character' });

    otpDoc.used = true;
    await otpDoc.save();

    const user = await UserModel.findOne({ email: otpDoc.email });
    if (!user) return res.status(404).json({ message: 'User not found.' });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.mustChangePassword = false;
    await user.save();

    await AuditLog.create({
      action: 'Password Reset',
      targetUser: user._id,
      targetEmail: user.email,
      actorUser: user._id,
      actorName: `${user.fname || ''} ${user.lname || ''}`.trim(),
      actorRole: user.role || 'user',
      details: 'User reset password via email OTP',
    });

    return res.json({ message: 'Password reset successful' });

  } catch (err) {
    console.error('resetPasswordWithOtp error:', err);
    return res.status(500).json({ message: 'Password reset failed' });
  }
};


module.exports = {
  login,
  verifyLoginOtp,
  resendLoginOtp,

  changePassword,

  requestEmailOtp,
  resendEmailOtp,
  verifyEmailOtpAndRegister,

  requestPasswordResetOtp,
  resendPasswordResetOtp,
  verifyPasswordResetOtp,
  resetPasswordWithOtp,
};
