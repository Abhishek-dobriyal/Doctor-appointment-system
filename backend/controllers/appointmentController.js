const { validationResult } = require('express-validator');
const mongoose = require('mongoose');
const Appointment = require('../models/Appointment');
const User = require('../models/User');

function endTime(start, durationMinutes) {
  return new Date(new Date(start).getTime() + durationMinutes * 60 * 1000);
}

async function hasOverlap(doctorId, startTime, durationMinutes, excludeId) {
  const start = new Date(startTime);
  const newEnd = endTime(start, durationMinutes);
  const busyStatuses = ['pending', 'accepted'];
  const filter = {
    doctor: doctorId,
    status: { $in: busyStatuses },
  };
  if (excludeId) filter._id = { $ne: excludeId };

  const existing = await Appointment.find(filter);
  for (const appt of existing) {
    const apStart = new Date(appt.startTime);
    const apEnd = endTime(apStart, appt.durationMinutes);
    if (start < apEnd && newEnd > apStart) {
      return true;
    }
  }
  return false;
}

async function create(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', details: errors.array() });
    }
    if (req.user.role !== 'patient') {
      return res.status(403).json({ message: 'Only patients can book' });
    }
    const { doctorId, startTime, durationMinutes, notes } = req.body;
    const doctor = await User.findById(doctorId);
    if (!doctor || doctor.role !== 'doctor' || !doctor.isActive) {
      return res.status(400).json({ message: 'Invalid doctor' });
    }
    const overlap = await hasOverlap(doctorId, startTime, durationMinutes);
    if (overlap) {
      return res.status(409).json({ message: 'This slot overlaps an existing booking' });
    }
    const appt = await Appointment.create({
      patient: req.user._id,
      doctor: doctorId,
      startTime,
      durationMinutes,
      notes: notes || '',
      status: 'pending',
    });
    const populated = await Appointment.findById(appt._id)
      .populate('doctor', 'name email specialization')
      .populate('patient', 'name email phone');
    res.status(201).json(populated);
  } catch (err) {
    next(err);
  }
}

async function listMine(req, res, next) {
  try {
    const filter =
      req.user.role === 'patient'
        ? { patient: req.user._id }
        : req.user.role === 'doctor'
          ? { doctor: req.user._id }
          : {};
    if (req.user.role === 'admin') {
      const all = await Appointment.find({})
        .populate('doctor', 'name email specialization')
        .populate('patient', 'name email phone')
        .sort({ startTime: -1 })
        .limit(200);
      return res.json(all);
    }
    const list = await Appointment.find(filter)
      .populate('doctor', 'name email specialization')
      .populate('patient', 'name email phone')
      .sort({ startTime: -1 });
    res.json(list);
  } catch (err) {
    next(err);
  }
}

async function updateStatus(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', details: errors.array() });
    }
    if (req.user.role !== 'doctor') {
      return res.status(403).json({ message: 'Only doctors can update booking status' });
    }
    const { status, doctorNotes } = req.body;
    const appt = await Appointment.findById(req.params.id);
    if (!appt || appt.doctor.toString() !== req.user._id.toString()) {
      return res.status(404).json({ message: 'Appointment not found' });
    }
    if (status === 'accepted') {
      const others = await Appointment.find({
        doctor: appt.doctor,
        status: { $in: ['pending', 'accepted'] },
        _id: { $ne: appt._id },
      });
      const start = new Date(appt.startTime);
      const newEnd = endTime(start, appt.durationMinutes);
      for (const o of others) {
        const os = new Date(o.startTime);
        const oe = endTime(os, o.durationMinutes);
        if (start < oe && newEnd > os) {
          return res.status(409).json({ message: 'Conflicts with another booking' });
        }
      }
    }
    appt.status = status;
    if (doctorNotes !== undefined) appt.doctorNotes = String(doctorNotes).slice(0, 2000);
    await appt.save();
    const populated = await Appointment.findById(appt._id)
      .populate('doctor', 'name email specialization')
      .populate('patient', 'name email phone');
    res.json(populated);
  } catch (err) {
    next(err);
  }
}

/** Doctor: suggested slots next N days based on availability (simple generator) */
async function doctorSlots(req, res, next) {
  try {
    const doctorId = req.params.doctorId;
    if (!mongoose.Types.ObjectId.isValid(doctorId)) {
      return res.status(400).json({ message: 'Invalid doctor id' });
    }
    const doctor = await User.findById(doctorId).lean();
    if (!doctor || doctor.role !== 'doctor') {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    const duration = Math.min(
      60,
      Math.max(15, Number(req.query.duration) || 30)
    );
    if (![15, 30, 60].includes(duration)) {
      return res.status(400).json({ message: 'duration must be 15, 30, or 60' });
    }
    const daysAhead = Math.min(14, Math.max(1, Number(req.query.days) || 7));
    const slots = [];
    const now = new Date();
    const av = doctor.availability || [];

    for (let d = 0; d < daysAhead; d++) {
      const dayDate = new Date(now);
      dayDate.setDate(dayDate.getDate() + d);
      dayDate.setHours(0, 0, 0, 0);
      const dow = dayDate.getDay();
      const daySlots = av.filter((a) => a.dayOfWeek === dow);
      for (const block of daySlots) {
        let m = block.startMinutes;
        while (m + duration <= block.endMinutes) {
          const start = new Date(dayDate);
          start.setHours(0, m, 0, 0);
          if (start > now) {
            const busy = await hasOverlap(doctorId, start, duration);
            if (!busy) {
              slots.push({ startTime: start.toISOString(), durationMinutes: duration });
            }
          }
          m += duration;
        }
      }
    }

    res.json({ doctorId, durationMinutes: duration, slots: slots.slice(0, 80) });
  } catch (err) {
    next(err);
  }
}

module.exports = { create, listMine, updateStatus, doctorSlots };
