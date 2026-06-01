const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const mlController = require('../controllers/mlController');

// Admin-only endpoints to view ML monitoring and job runs
router.get('/monitoring/latest', protect, authorize('admin'), mlController.getMonitoring);
router.get('/jobs/recent', protect, authorize('admin'), mlController.getJobRuns);

module.exports = router;
