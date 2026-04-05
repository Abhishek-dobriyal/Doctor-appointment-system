const express = require('express');
const { body } = require('express-validator');
const prescriptionController = require('../controllers/prescriptionController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post(
  '/',
  requireAuth,
  body('patientId').isMongoId(),
  body('appointmentId').optional().isMongoId(),
  body('title').optional().trim().isLength({ max: 200 }),
  body('items').optional().isArray(),
  prescriptionController.create
);

router.get('/mine', requireAuth, prescriptionController.listMine);

module.exports = router;
