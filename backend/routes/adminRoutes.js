const express = require('express');
const adminController = require('../controllers/adminController');
const { requireAuth, requireRoles } = require('../middleware/auth');

const router = express.Router();

router.get('/stats', requireAuth, requireRoles('admin'), adminController.stats);
router.get('/export/csv', requireAuth, requireRoles('admin'), adminController.exportCsv);

module.exports = router;
