const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const { signAccessToken, signOtpChallengeToken, verifyOtpChallengeToken, randomOtp } = require('../utils/tokens');
const { setOtp, verifyAndConsume } = require('../utils/otpStore');

async function register(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', details: errors.array() });
    }
    const { email, password, name } = req.body;
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: 'Email already registered' });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      email: email.toLowerCase(),
      passwordHash,
      role: 'patient',
      name: name || '',
    });
    const token = signAccessToken(user._id.toString(), user.role);
    res.status(201).json({
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        name: user.name,
        otpEnabled: user.otpEnabled,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', details: errors.array() });
    }
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    user.lastActivity = new Date();
    await user.save({ validateBeforeUpdate: false });

    if (user.otpEnabled) {
      const code = randomOtp();
      setOtp(user.email, code);
      console.log(`[2FA simulation] OTP for ${user.email}: ${code}`);
      const challenge = signOtpChallengeToken(user._id.toString());
      return res.json({
        needsOtp: true,
        otpChallengeToken: challenge,
        message: 'OTP sent (check server console for demo code)',
      });
    }

    const token = signAccessToken(user._id.toString(), user.role);
    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        name: user.name,
        specialization: user.specialization,
        otpEnabled: user.otpEnabled,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function verifyOtp(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', details: errors.array() });
    }
    const { otpChallengeToken, code } = req.body;
    let payload;
    try {
      payload = verifyOtpChallengeToken(otpChallengeToken);
    } catch {
      return res.status(401).json({ message: 'Invalid or expired challenge' });
    }
    const user = await User.findById(payload.sub);
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'User not found' });
    }
    if (!verifyAndConsume(user.email, code)) {
      return res.status(401).json({ message: 'Invalid or expired OTP' });
    }
    user.lastActivity = new Date();
    await user.save({ validateBeforeUpdate: false });
    const token = signAccessToken(user._id.toString(), user.role);
    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        name: user.name,
        specialization: user.specialization,
        otpEnabled: user.otpEnabled,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    const u = req.user;
    res.json({
      id: u._id,
      email: u.email,
      role: u.role,
      name: u.name,
      dob: u.dob,
      gender: u.gender,
      phone: u.phone,
      specialization: u.specialization,
      bio: u.bio,
      availability: u.availability,
      otpEnabled: u.otpEnabled,
      lastActivity: u.lastActivity,
    });
  } catch (err) {
    next(err);
  }
}

async function toggleOtp(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', details: errors.array() });
    }
    if (req.user.role !== 'patient' && req.user.role !== 'doctor') {
      return res.status(403).json({ message: 'Not allowed' });
    }
    const { enabled } = req.body;
    req.user.otpEnabled = Boolean(enabled);
    await req.user.save();
    res.json({ otpEnabled: req.user.otpEnabled });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, verifyOtp, me, toggleOtp };
