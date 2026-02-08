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

const MAX_LOGIN_ATTEMPTS = 3;

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

const isValidEmail = (email) => {
  const e = String(email || '').trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
};

const sendOtpEmail = async (email, code, subject = 'Your Verification Code') => {
  const transporter = makeTransporter();
  await transporter.sendMail({
    from: GMAIL_USER,
    to: email,
    subject,
    text: `Your verification code is: ${code}\n\nExpires in ${OTP_EXP_MINUTES} minutes.`,
  });
  return { ok: true };
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

const validatePasswordRules = (password) => {
  const pass = String(password || '');
  if (pass.length < 8) return 'Password must be at least 8 characters long.';
  if (!/[!@#$%^&*]/.test(pass)) return 'Password must contain at least one special character (!@#$%^&*).';
  if (!/[A-Z]/.test(pass)) return 'Password must contain at least one CAPITAL letter.';
  if (!/\d/.test(pass)) return 'Password must contain at least one number.';
  return null;
};

// ---------------- LOGIN ----------------
const login = async (req, res) => {
  try {
    const { usernameOrEmail, password } = req.body;

    if (!usernameOrEmail || !password) {
      return res.status(400).json({ message: 'username/email and password are required' });
    }

    const cleanUser = String(usernameOrEmail).trim();
    const user = await UserModel.findOne({
      $or: [{ username: cleanUser }, { email: cleanUser.toLowerCase() }],
    });

    if (!user) return res.status(401).json({ message: 'Username and password invalid' });

    if (user.active === false) {
      return res.status(403).json({ message: 'Account is deactivated. Please contact admin.' });
    }

    const ok = await bcrypt.compare(password, user.password);

    if (!ok) {
      user.failedLoginAttempts = Number(user.failedLoginAttempts || 0) + 1;
      user.lastFailedLoginAt = new Date();

      if (user.failedLoginAttempts >= MAX_LOGIN_ATTEMPTS) {
        user.active = false;

        try {
          await AuditLog.create({
            action: 'Account auto-deactivated (3 invalid logins)',
            targetUser: user._id,
            targetEmail: user.email,
            actorUser: user._id,
            actorName: `${user.fname || ''} ${user.lname || ''}`.trim(),
            actorRole: user.role || 'user',
            details: `Auto-deactivated after ${user.failedLoginAttempts} failed login attempts`,
          });
        } catch (logErr) {
          console.error('AuditLog(Auto-Deactivate) error:', logErr);
        }

        await user.save();

        return res.status(403).json({
          message: 'Account is deactivated due to 3 failed login attempts. Please contact admin.',
        });
      }

      await user.save();

      return res.status(401).json({
        message: 'Username and password invalid',
      });
    }

    // reset attempts on success
    if (user.failedLoginAttempts > 0 || user.lastFailedLoginAt) {
      user.failedLoginAttempts = 0;
      user.lastFailedLoginAt = null;
    }

    // MFA
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

      try {
        await sendOtpEmail(user.email, code, 'Your Login Verification Code');
      } catch (mailErr) {
        console.error('sendOtpEmail(login) error:', mailErr);
        return res.status(500).json({ message: 'Failed to send OTP. Please try again later.' });
      }

      await user.save();

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

    await user.save();

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

    user.failedLoginAttempts = 0;
    user.lastFailedLoginAt = null;

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

    try {
      await sendOtpEmail(cleanEmail, code, 'Your Login Verification Code');
    } catch (mailErr) {
      console.error('sendOtpEmail(resend login) error:', mailErr);
      return res.status(500).json({ message: 'Failed to resend code.' });
    }

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

// ---------------- CHANGE PASSWORD ----------------

const changePassword = async (req, res) => {
  try {
    const { userId, currentPassword, newPassword, otpId, code } = req.body;

    if (!userId || !currentPassword || !newPassword) {
      return res.status(400).json({ message: 'userId, currentPassword, and newPassword are required' });
    }

    const user = await UserModel.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.active === false) {
      return res.status(403).json({ message: 'Account is deactivated. Please contact admin.' });
    }

    const ok = await bcrypt.compare(currentPassword, user.password);
    if (!ok) return res.status(401).json({ message: 'Current password is incorrect' });

    const passErr = validatePasswordRules(newPassword);
    if (passErr) return res.status(400).json({ message: passErr });

    const purpose = 'change_password';

    if (otpId && code) {
      const otpDoc = await EmailOtp.findById(otpId);
      if (!otpDoc) return res.status(400).json({ message: 'OTP expired or not found.' });
      if (otpDoc.used) return res.status(400).json({ message: 'OTP already used.' });
      if (otpDoc.expiresAt < new Date()) return res.status(400).json({ message: 'OTP expired.' });
      if (otpDoc.purpose !== purpose) return res.status(400).json({ message: 'Invalid OTP purpose.' });
      if (String(otpDoc.email || '').toLowerCase() !== String(user.email || '').toLowerCase()) {
        return res.status(400).json({ message: 'OTP email mismatch. Please resend code.' });
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

      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
      user.mustChangePassword = false;
      await user.save();

      try {
        await AuditLog.create({
          action: 'Password Change (OTP Verified)',
          targetUser: user._id,
          targetEmail: user.email,
          actorUser: user._id,
          actorName: `${user.fname || ''} ${user.lname || ''}`.trim(),
          actorRole: user.role || 'user',
          details: 'User changed password with OTP verification',
        });
      } catch (logErr) {
        console.error('AuditLog(Password Change OTP) error:', logErr);
      }

      return res.json({
        message: 'Password updated successfully',
        changed: true,
      });
    }

    if (!isValidEmail(user.email)) {
      return res.status(400).json({ message: 'User email is invalid. Please update your email first.' });
    }

    const cooldown = await enforceCooldown(user.email, purpose, 'Please wait');
    if (cooldown.blocked) return res.status(429).json({ message: cooldown.message });

    const otpCode = makeOtpCode();
    const codeHash = await bcrypt.hash(otpCode, 10);
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

    try {
      await sendOtpEmail(user.email, otpCode, 'Your Password Change Verification Code');
    } catch (mailErr) {
      console.error('sendOtpEmail(change password) error:', mailErr);
      return res.status(500).json({ message: 'Failed to send OTP. Please try again later.' });
    }

    return res.json({
      message: 'OTP required',
      otpRequired: true,
      otpId: otpDoc._id,
      maskedEmail: maskEmail(user.email),
      expiresAt: otpDoc.expiresAt,
    });
  } catch (err) {
    console.error('Change password error:', err);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

const resendChangePasswordOtp = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: 'userId is required' });

    const user = await UserModel.findById(userId).lean();
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.active === false) {
      return res.status(403).json({ message: 'Account is deactivated. Please contact admin.' });
    }

    const purpose = 'change_password';

    if (!isValidEmail(user.email)) {
      return res.status(400).json({ message: 'User email is invalid. Please update your email first.' });
    }

    const cooldown = await enforceCooldown(user.email, purpose, 'Please wait');
    if (cooldown.blocked) return res.status(429).json({ message: cooldown.message });

    const otpCode = makeOtpCode();
    const codeHash = await bcrypt.hash(otpCode, 10);
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

    try {
      await sendOtpEmail(user.email, otpCode, 'Your Password Change Verification Code');
    } catch (mailErr) {
      console.error('sendOtpEmail(resend change password) error:', mailErr);
      return res.status(500).json({ message: 'Failed to resend code.' });
    }

    return res.json({
      otpId: otpDoc._id,
      maskedEmail: maskEmail(user.email),
      expiresAt: otpDoc.expiresAt,
    });
  } catch (err) {
    console.error('resendChangePasswordOtp error:', err);
    return res.status(500).json({ message: 'Failed to resend code' });
  }
};

// ---------------- REGISTER OTP ----------------
const requestEmailOtp = async (req, res) => {
  try {
    const { email, purpose } = req.body;
    if (!email) return res.status(400).json({ message: 'email is required' });

    const cleanEmail = email.trim().toLowerCase();
    const realPurpose = purpose || 'register';

    if (!isValidEmail(cleanEmail)) {
      return res.status(400).json({ message: 'Please enter a valid email address.' });
    }

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

    try {
      await sendOtpEmail(cleanEmail, code, 'Your Registration Verification Code');
    } catch (mailErr) {
      console.error('sendOtpEmail(register) error:', mailErr);
      return res.status(500).json({ message: 'Failed to send OTP. Please try again later.' });
    }

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

    if (!isValidEmail(cleanEmail)) {
      return res.status(400).json({ message: 'Please enter a valid email address.' });
    }

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

    try {
      await sendOtpEmail(cleanEmail, code, 'Your Registration Verification Code');
    } catch (mailErr) {
      console.error('sendOtpEmail(resend register) error:', mailErr);
      return res.status(500).json({ message: 'Failed to resend code.' });
    }

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

    if (!isValidEmail(cleanEmail)) {
      return res.status(400).json({ message: 'Please enter a valid email address.' });
    }

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

    const passErr = validatePasswordRules(password);
    if (passErr) return res.status(400).json({ message: passErr });

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
      role: 'student',
      active: true,
      mfaLastVerifiedAt: null,
      mustChangePassword: false,

      failedLoginAttempts: 0,
      lastFailedLoginAt: null,
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

    if (!isValidEmail(cleanEmail)) {
      return res.status(400).json({ message: 'Please enter a valid email address.' });
    }

    const user = await UserModel.findOne({ email: cleanEmail }).lean();
    if (!user) return res.status(404).json({ message: 'Email not found.' });

    if (user.active === false) {
      return res.status(403).json({ message: 'Account is deactivated. Please contact admin.' });
    }

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

    try {
      await sendOtpEmail(cleanEmail, code, 'Your Password Reset Code');
    } catch (mailErr) {
      console.error('sendOtpEmail(reset) error:', mailErr);
      return res.status(500).json({ message: 'Failed to send reset OTP' });
    }

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

    if (!isValidEmail(cleanEmail)) {
      return res.status(400).json({ message: 'Please enter a valid email address.' });
    }

    const user = await UserModel.findOne({ email: cleanEmail }).lean();
    if (!user) return res.status(404).json({ message: 'Email not found.' });

    if (user.active === false) {
      return res.status(403).json({ message: 'Account is deactivated. Please contact admin.' });
    }

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

    try {
      await sendOtpEmail(cleanEmail, code, 'Your Password Reset Code');
    } catch (mailErr) {
      console.error('sendOtpEmail(resend reset) error:', mailErr);
      return res.status(500).json({ message: 'Failed to resend reset OTP' });
    }

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
    const { otpId, code, newPassword } = req.body; // ✅ include newPassword

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
    if (otpDoc.attempts >= otpDoc.maxAttempts) {
      return res.status(429).json({ message: 'Too many attempts. Please resend code.' });
    }

    const isValid = await bcrypt.compare(String(code).trim(), otpDoc.codeHash);
    if (!isValid) {
      otpDoc.attempts += 1;
      await otpDoc.save();
      return res.status(400).json({
        message: `Invalid code. Attempts left: ${otpDoc.maxAttempts - otpDoc.attempts}`
      });
    }

    // ✅ If verification only (no new password yet)
    if (!newPassword) {
      return res.json({ message: 'OTP verified' });
    }

    const passErr = validatePasswordRules(newPassword);
    if (passErr) return res.status(400).json({ message: passErr });

    otpDoc.used = true;
    await otpDoc.save();

    const user = await UserModel.findOne({ email: otpDoc.email });
    if (!user) return res.status(404).json({ message: 'User not found.' });
    if (user.active === false) {
      return res.status(403).json({ message: 'Account is deactivated. Please contact admin.' });
    }

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
    console.error('verifyPasswordResetOtp error:', err);
    return res.status(500).json({ message: 'Password reset failed' });
  }
};


module.exports = {
  login,
  verifyLoginOtp,
  resendLoginOtp,

  changePassword,
  resendChangePasswordOtp,

  requestEmailOtp,
  resendEmailOtp,
  verifyEmailOtpAndRegister,

  requestPasswordResetOtp,
  resendPasswordResetOtp,
  verifyPasswordResetOtp,
};
