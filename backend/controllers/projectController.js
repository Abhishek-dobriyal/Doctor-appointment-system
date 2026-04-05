const { validationResult } = require('express-validator');
const Project = require('../models/Project');
const Task = require('../models/Task');
const User = require('../models/User');

async function create(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', details: errors.array() });
    }
    if (req.user.role !== 'doctor') {
      return res.status(403).json({ message: 'Only doctors create projects' });
    }
    const { patientId, title, description } = req.body;
    const patient = await User.findById(patientId);
    if (!patient || patient.role !== 'patient') {
      return res.status(400).json({ message: 'Invalid patient' });
    }
    const project = await Project.create({
      patient: patientId,
      doctor: req.user._id,
      title,
      description: description || '',
    });
    const populated = await Project.findById(project._id)
      .populate('patient', 'name email phone')
      .populate('doctor', 'name specialization');
    res.status(201).json(populated);
  } catch (err) {
    next(err);
  }
}

async function listMine(req, res, next) {
  try {
    let filter = {};
    if (req.user.role === 'patient') {
      filter.patient = req.user._id;
    } else if (req.user.role === 'doctor') {
      filter.doctor = req.user._id;
    } else {
      filter = {};
    }
    const projects = await Project.find(filter)
      .populate('patient', 'name email phone')
      .populate('doctor', 'name specialization')
      .sort({ updatedAt: -1 });
    res.json(projects);
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const project = await Project.findById(req.params.id)
      .populate('patient', 'name email phone')
      .populate('doctor', 'name specialization');
    if (!project) return res.status(404).json({ message: 'Project not found' });
    const pid = project.patient._id ? project.patient._id.toString() : String(project.patient);
    const did = project.doctor._id ? project.doctor._id.toString() : String(project.doctor);
    if (req.user.role === 'patient' && pid !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    if (req.user.role === 'doctor' && did !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const tasks = await Task.find({ project: project._id }).sort({ deadline: 1, createdAt: 1 });
    res.json({ project, tasks });
  } catch (err) {
    next(err);
  }
}

async function updateProject(req, res, next) {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Not found' });
    if (req.user.role !== 'doctor' || project.doctor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const { title, description, status } = req.body;
    if (title !== undefined) project.title = title;
    if (description !== undefined) project.description = description;
    if (status !== undefined) project.status = status;
    await project.save();
    const populated = await Project.findById(project._id)
      .populate('patient', 'name email phone')
      .populate('doctor', 'name specialization');
    res.json(populated);
  } catch (err) {
    next(err);
  }
}

async function deleteProject(req, res, next) {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Not found' });
    if (req.user.role === 'admin') {
      await Task.deleteMany({ project: project._id });
      await project.deleteOne();
      return res.json({ message: 'Deleted' });
    }
    if (req.user.role !== 'doctor' || project.doctor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    await Task.deleteMany({ project: project._id });
    await project.deleteOne();
    res.json({ message: 'Deleted' });
  } catch (err) {
    next(err);
  }
}

module.exports = { create, listMine, getOne, updateProject, deleteProject };
