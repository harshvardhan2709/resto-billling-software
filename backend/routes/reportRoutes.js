const express = require('express');
const router = express.Router();
const {
  getDashboardMetrics,
  getDetailedAnalytics,
  exportSalesReportCSV,
} = require('../controllers/reportController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

// All reporting endpoints are restricted to Admin
router.get('/dashboard', protect, authorize('admin'), getDashboardMetrics);
router.get('/analytics', protect, authorize('admin'), getDetailedAnalytics);
router.get('/export-csv', protect, authorize('admin'), exportSalesReportCSV);

module.exports = router;
