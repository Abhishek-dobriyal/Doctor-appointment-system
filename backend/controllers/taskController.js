const { validationResult } = require('express-validator');
const Project = require('../models/Project');
const Task = require('../models/Task');

async function assertDoctorOwnsProject(userId, projectId) {
  const project = await Project.findById(projectId);
  if (!project) return { error: 'Project not found', status: 404 };
  if (project.doctor.toString() !== userId.toString()) {
    return { error: 'Forbidden', status: 403 };
  }
  return { project };
}

async function create(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', details: errors.array() });
    }
    if (req.user.role !== 'doctor') {
      return res.status(403).json({ message: 'Only doctors add tasks' });
    }
    const { projectId } = req.params;
    const check = await assertDoctorOwnsProject(req.user._id, projectId);
    if (check.error) return res.status(check.status).json({ message: check.error });
    const { title, type, deadline, details } = req.body;
    const task = await Task.create({
      project: projectId,
      title,
      type: type || 'other',
      deadline: deadline ? new Date(deadline) : undefined,
      details: details || '',
    });
    res.status(201).json(task);
  } catch (err) {
    next(err);
  }
}

async function updateTask(req, res, next) {
  try {
    const task = await Task.findById(req.params.taskId);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    const project = await Project.findById(task.project);
    if (!project) return res.status(404).json({ message: 'Project missing' });

    if (req.user.role === 'doctor' && project.doctor.toString() === req.user._id.toString()) {
      const { title, type, deadline, status, details } = req.body;
      if (title !== undefined) task.title = title;
      if (type !== undefined) task.type = type;
      if (deadline !== undefined) task.deadline = deadline ? new Date(deadline) : null;
      if (status !== undefined) task.status = status;
      if (details !== undefined) task.details = details;
      await task.save();
      return res.json(task);
    }

    if (req.user.role === 'patient' && project.patient.toString() === req.user._id.toString()) {
      const { status } = req.body;
      if (status === 'completed' || status === 'pending') {
        task.status = status;
        await task.save();
        return res.json(task);
      }
      return res.status(400).json({ message: 'Patients may only toggle task status' });
    }

    return res.status(403).json({ message: 'Forbidden' });
  } catch (err) {
    next(err);
  }
}

async function deleteTask(req, res, next) {
  try {
    if (req.user.role !== 'doctor') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const task = await Task.findById(req.params.taskId);
    if (!task) return res.status(404).json({ message: 'Not found' });
    const check = await assertDoctorOwnsProject(req.user._id, task.project);
    if (check.error) return res.status(check.status).json({ message: check.error });
    await task.deleteOne();
    res.json({ message: 'Deleted' });
  } catch (err) {
    next(err);
  }
}

module.exports = { create, updateTask, deleteTask };
