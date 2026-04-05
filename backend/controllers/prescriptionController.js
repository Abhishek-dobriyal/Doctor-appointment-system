const crypto = require('crypto');
const { validationResult } = require('express-validator');
const Prescription = require('../models/Prescription');
const User = require('../models/User');

async function create(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', details: errors.array() });
    }
    if (req.user.role !== 'doctor') {
      return res.status(403).json({ message: 'Only doctors issue prescriptions' });
    }
    const { patientId, appointmentId, title, items } = req.body;
    const patient = await User.findById(patientId);
    if (!patient || patient.role !== 'patient') {
      return res.status(400).json({ message: 'Invalid patient' });
    }
    const mockPdfToken = crypto.randomBytes(24).toString('hex');
    const rx = await Prescription.create({
      patient: patientId,
      doctor: req.user._id,
      appointment: appointmentId || undefined,
      title: title || 'Prescription',
      items: Array.isArray(items) ? items : [],
      mockPdfToken,
    });
    const populated = await Prescription.findById(rx._id)
      .populate('doctor', 'name specialization')
      .populate('patient', 'name email');
    res.status(201).json(populated);
  } catch (err) {
    next(err);
  }
}

async function listMine(req, res, next) {
  try {
    if (req.user.role !== 'patient') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const list = await Prescription.find({ patient: req.user._id })
      .populate('doctor', 'name specialization')
      .sort({ createdAt: -1 });
    res.json(list);
  } catch (err) {
    next(err);
  }
}

/** HTML mock “PDF” for print/save */
function mockPdfPage(req, res) {
  const { token } = req.params;
  Prescription.findOne({ mockPdfToken: token })
    .populate('doctor', 'name specialization')
    .populate('patient', 'name email')
    .then((rx) => {
      if (!rx) {
        res.status(404).send('<p>Prescription not found</p>');
        return;
      }
      const itemsHtml = (rx.items || [])
        .map((i) => `<li>${String(i).replace(/</g, '&lt;')}</li>`)
        .join('');
      res.type('html').send(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${rx.title}</title>
<style>
body{font-family:system-ui,sans-serif;max-width:600px;margin:2rem auto;padding:1rem;border:1px solid #ccc;}
h1{font-size:1.25rem;} ul{line-height:1.6;}
</style></head><body>
<h1>${rx.title}</h1>
<p><strong>Patient:</strong> ${rx.patient?.name || ''} (${rx.patient?.email || ''})</p>
<p><strong>Doctor:</strong> ${rx.doctor?.name || ''} — ${rx.doctor?.specialization || ''}</p>
<p><strong>Date:</strong> ${rx.createdAt.toISOString().slice(0, 10)}</p>
<ul>${itemsHtml || '<li>No line items</li>'}</ul>
<p><em>Mock document for demonstration.</em></p>
</body></html>`);
    })
    .catch(() => res.status(500).send('Error'));
}

module.exports = { create, listMine, mockPdfPage };
