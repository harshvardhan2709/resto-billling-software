const express = require('express');
const router = express.Router();
const { getDashboardMetrics } = require('../controllers/reportController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

// Reports and analytics are restricted to Admin
router.get('/dashboard', protect, authorize('admin'), getDashboardMetrics);

module.exports = router;
