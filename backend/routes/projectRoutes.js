const express = require('express');
const { body, param } = require('express-validator');
const projectController = require('../controllers/projectController');
const taskController = require('../controllers/taskController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post(
  '/',
  requireAuth,
  body('patientId').isMongoId(),
  body('title').trim().isLength({ min: 1, max: 200 }),
  body('description').optional().trim().isLength({ max: 5000 }),
  projectController.create
);

router.get('/', requireAuth, projectController.listMine);
router.get('/:id', requireAuth, param('id').isMongoId(), projectController.getOne);
router.patch(
  '/:id',
  requireAuth,
  param('id').isMongoId(),
  body('title').optional().trim().isLength({ max: 200 }),
  body('description').optional().trim(),
  body('status').optional().isIn(['active', 'archived']),
  projectController.updateProject
);
router.delete('/:id', requireAuth, param('id').isMongoId(), projectController.deleteProject);

router.post(
  '/:projectId/tasks',
  requireAuth,
  param('projectId').isMongoId(),
  body('title').trim().isLength({ min: 1, max: 300 }),
  body('type').optional().isIn(['medication', 'test', 'diet', 'other']),
  body('deadline').optional().isISO8601(),
  body('details').optional().trim().isLength({ max: 2000 }),
  taskController.create
);

router.patch(
  '/tasks/:taskId',
  requireAuth,
  param('taskId').isMongoId(),
  body('title').optional().trim(),
  body('type').optional().isIn(['medication', 'test', 'diet', 'other']),
  body('deadline').optional().isISO8601(),
  body('status').optional().isIn(['pending', 'completed']),
  body('details').optional().trim(),
  taskController.updateTask
);

router.delete('/tasks/:taskId', requireAuth, param('taskId').isMongoId(), taskController.deleteTask);

module.exports = router;
