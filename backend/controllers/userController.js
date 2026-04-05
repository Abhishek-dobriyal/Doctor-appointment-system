const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const User = require('../models/User');

function sanitizeUserDoc(doc) {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : doc;
  delete o.passwordHash;
  return o;
}

async function updateProfile(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', details: errors.array() });
    }
    const u = req.user;
    const { name, dob, gender, phone, specialization, bio, availability } = req.body;

    if (name !== undefined) u.name = String(name).slice(0, 120);
    if (dob !== undefined) u.dob = dob ? new Date(dob) : undefined;
    if (gender !== undefined) u.gender = gender;
    if (phone !== undefined) u.phone = String(phone).slice(0, 32);

    if (u.role === 'doctor') {
      if (specialization !== undefined) u.specialization = String(specialization).slice(0, 120);
      if (bio !== undefined) u.bio = String(bio).slice(0, 2000);
      if (availability !== undefined) {
        if (!Array.isArray(availability)) {
          return res.status(400).json({ message: 'availability must be an array' });
        }
        u.availability = availability.map((s) => ({
          dayOfWeek: Number(s.dayOfWeek),
          startMinutes: Number(s.startMinutes),
          endMinutes: Number(s.endMinutes),
        }));
      }
    }

    await u.save();
    res.json(sanitizeUserDoc(u));
  } catch (err) {
    next(err);
  }
}

async function changePassword(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', details: errors.array() });
    }
    const { currentPassword, newPassword } = req.body;
    const u = await User.findById(req.user._id).select('+passwordHash');
    const ok = await bcrypt.compare(currentPassword, u.passwordHash);
    if (!ok) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }
    u.passwordHash = await bcrypt.hash(newPassword, 12);
    await u.save();
    res.json({ message: 'Password updated' });
  } catch (err) {
    next(err);
  }
}

/** Public list for patients: search doctors */
async function listDoctors(req, res, next) {
  try {
    const q = (req.query.q || '').trim();
    const specialty = (req.query.specialty || '').trim();
    const availableDay = req.query.day;
    const filter = { role: 'doctor', isActive: true };
    if (q) {
      filter.$or = [
        { name: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
        { specialization: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
      ];
    }
    if (specialty) {
      filter.specialization = new RegExp(specialty.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    }
    let doctors = await User.find(filter).select('-passwordHash').lean();

    if (availableDay !== undefined && availableDay !== '') {
      const d = Number(availableDay);
      doctors = doctors.filter(
        (doc) =>
          Array.isArray(doc.availability) &&
          doc.availability.some((a) => a.dayOfWeek === d)
      );
    }

    res.json(doctors);
  } catch (err) {
    next(err);
  }
}

/** Admin: list users with optional role filter */
async function adminListUsers(req, res, next) {
  try {
    const role = req.query.role;
    const filter = {};
    if (role) filter.role = role;
    const users = await User.find(filter).select('-passwordHash').sort({ createdAt: -1 }).lean();
    res.json(users);
  } catch (err) {
    next(err);
  }
}

/** Admin: get one user */
async function adminGetUser(req, res, next) {
  try {
    const u = await User.findById(req.params.id).select('-passwordHash');
    if (!u) return res.status(404).json({ message: 'User not found' });
    res.json(u);
  } catch (err) {
    next(err);
  }
}

/** Admin: create user (any role) */
async function adminCreateUser(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', details: errors.array() });
    }
    const { email, password, role, name, specialization, phone } = req.body;
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(409).json({ message: 'Email already exists' });
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      email: email.toLowerCase(),
      passwordHash,
      role,
      name: name || '',
      specialization: role === 'doctor' ? specialization || '' : '',
      phone: phone || '',
    });
    res.status(201).json(sanitizeUserDoc(user));
  } catch (err) {
    next(err);
  }
}

/** Admin: update user */
async function adminUpdateUser(req, res, next) {
  try {
    const u = await User.findById(req.params.id);
    if (!u) return res.status(404).json({ message: 'User not found' });
    const { name, role, specialization, phone, isActive, gender, dob } = req.body;
    if (name !== undefined) u.name = name;
    if (role !== undefined) u.role = role;
    if (specialization !== undefined) u.specialization = specialization;
    if (phone !== undefined) u.phone = phone;
    if (isActive !== undefined) u.isActive = Boolean(isActive);
    if (gender !== undefined) u.gender = gender;
    if (dob !== undefined) u.dob = dob ? new Date(dob) : null;
    await u.save();
    res.json(sanitizeUserDoc(u));
  } catch (err) {
    next(err);
  }
}

/** Admin: delete user */
async function adminDeleteUser(req, res, next) {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot delete yourself' });
    }
    const u = await User.findByIdAndDelete(req.params.id);
    if (!u) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  updateProfile,
  changePassword,
  listDoctors,
  adminListUsers,
  adminGetUser,
  adminCreateUser,
  adminUpdateUser,
  adminDeleteUser,
};
