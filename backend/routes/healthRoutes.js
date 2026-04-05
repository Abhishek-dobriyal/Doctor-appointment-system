const express = require('express');
const { param } = require('express-validator');
const healthController = require('../controllers/healthController');
const { requireAuth, requireRoles } = require('../middleware/auth');
const { uploadHealth } = require('../middleware/upload');

const router = express.Router();

router.post(
  '/',
  requireAuth,
  uploadHealth.single('file'),
  healthController.upload
);

router.get('/mine', requireAuth, healthController.listMine);
router.get(
  '/download/:id',
  requireAuth,
  param('id').isMongoId(),
  healthController.download
);
router.get('/admin/all', requireAuth, requireRoles('admin'), healthController.listAllForAdmin);
router.delete(
  '/:id',
  requireAuth,
  requireRoles('admin'),
  param('id').isMongoId(),
  healthController.removeUpload
);

module.exports = router;
