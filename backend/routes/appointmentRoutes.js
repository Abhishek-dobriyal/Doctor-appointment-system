const express = require('express');
const { body, param } = require('express-validator');
const appointmentController = require('../controllers/appointmentController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/slots/:doctorId', requireAuth, appointmentController.doctorSlots);

router.post(
  '/',
  requireAuth,
  body('doctorId').isMongoId(),
  body('startTime').isISO8601(),
  body('durationMinutes').isIn([15, 30, 60]),
  body('notes').optional().trim().isLength({ max: 2000 }),
  appointmentController.create
);

router.get('/', requireAuth, appointmentController.listMine);

router.patch(
  '/:id/status',
  requireAuth,
  param('id').isMongoId(),
  body('status').isIn(['accepted', 'rejected', 'completed', 'pending']),
  body('doctorNotes').optional().trim().isLength({ max: 2000 }),
  appointmentController.updateStatus
);

module.exports = router;
