const path = require('path');
const fs = require('fs');
const HealthUpload = require('../models/HealthUpload');
const { uploadDir } = require('../middleware/upload');

async function upload(req, res, next) {
  try {
    if (req.user.role !== 'patient') {
      return res.status(403).json({ message: 'Only patients upload health files' });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    const label = (req.body.label || 'Health report').slice(0, 200);
    const doc = await HealthUpload.create({
      patient: req.user._id,
      originalName: req.file.originalname,
      storedName: req.file.filename,
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size,
      label,
    });
    res.status(201).json(doc);
  } catch (err) {
    next(err);
  }
}

async function listMine(req, res, next) {
  try {
    if (req.user.role !== 'patient') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const list = await HealthUpload.find({ patient: req.user._id }).sort({ createdAt: -1 });
    res.json(list);
  } catch (err) {
    next(err);
  }
}

async function listAllForAdmin(req, res, next) {
  try {
    const list = await HealthUpload.find({})
      .populate('patient', 'name email')
      .sort({ createdAt: -1 })
      .limit(500);
    res.json(list);
  } catch (err) {
    next(err);
  }
}

async function removeUpload(req, res, next) {
  try {
    const doc = await HealthUpload.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Not found' });
    const filePath = path.join(uploadDir, doc.storedName);
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (e) {
      console.warn('File delete warning', e.message);
    }
    await doc.deleteOne();
    res.json({ message: 'Removed' });
  } catch (err) {
    next(err);
  }
}

async function download(req, res, next) {
  try {
    const doc = await HealthUpload.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Not found' });
    const isOwner = req.user.role === 'patient' && doc.patient.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const filePath = path.join(uploadDir, doc.storedName);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File missing on disk' });
    }
    res.download(filePath, doc.originalName || doc.storedName);
  } catch (err) {
    next(err);
  }
}

module.exports = { upload, listMine, listAllForAdmin, removeUpload, download };
