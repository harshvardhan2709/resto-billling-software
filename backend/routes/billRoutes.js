const express = require('express');
const router = express.Router();
const {
  getBills,
  getBillById,
  previewBill,
  createBill,
  recordPayment,
} = require('../controllers/billController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getBills);
router.get('/:id', protect, getBillById);
router.post('/preview', protect, previewBill);
router.post('/', protect, createBill);
router.post('/:id/payments', protect, recordPayment);

module.exports = router;
