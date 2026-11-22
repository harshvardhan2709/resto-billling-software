const express = require('express');
const router = express.Router();
const {
  getOrders,
  getOrderById,
  createOrder,
  addItemsToOrder,
  cancelOrder,
} = require('../controllers/orderController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getOrders);
router.get('/:id', protect, getOrderById);
router.post('/', protect, createOrder);
router.put('/:id/add-items', protect, addItemsToOrder);
router.put('/:id/cancel', protect, cancelOrder);

module.exports = router;
