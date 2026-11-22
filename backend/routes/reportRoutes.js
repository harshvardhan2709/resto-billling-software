const express = require('express');
const router = express.Router();
const {
  getDashboardMetrics,
  getDetailedAnalytics,
  exportSalesReportCSV,
} = require('../controllers/reportController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

// Dashboard metrics available to both Admin and Cashier for shift tracking
router.get('/dashboard', protect, authorize('admin', 'cashier'), getDashboardMetrics);

// Detailed financial analytics and audit CSV exports remain restricted to Admin
router.get('/analytics', protect, authorize('admin'), getDetailedAnalytics);
router.get('/export-csv', protect, authorize('admin'), exportSalesReportCSV);

module.exports = router;
