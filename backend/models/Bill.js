const mongoose = require('mongoose');

const billItemSchema = new mongoose.Schema(
  {
    menuItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MenuItem',
    },
    name: {
      type: String,
      required: true, // Snapshot of item name
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    price: {
      type: Number,
      required: true, // Snapshot of price at bill creation
      min: 0,
    },
    total: {
      type: Number,
      required: true, // Snapshot of item total
      min: 0,
    },
  },
  { _id: false }
);

const billSchema = new mongoose.Schema(
  {
    billNumber: {
      type: String,
      required: [true, 'Bill number is required'],
      unique: true,
      trim: true,
      index: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: [true, 'Order reference is required'],
    },
    cashier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Cashier reference is required'],
    },
    orderType: {
      type: String,
      required: true,
      enum: ['dine-in', 'takeaway'],
    },
    tableNumber: {
      type: String,
      default: 'Takeaway',
    },
    items: {
      type: [billItemSchema],
      required: true,
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    discountType: {
      type: String,
      enum: ['percentage', 'fixed'],
      default: 'fixed',
    },
    discountValue: {
      type: Number,
      default: 0,
      min: 0,
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    taxableAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    cgst: {
      type: Number,
      required: true,
      min: 0,
    },
    sgst: {
      type: Number,
      required: true,
      min: 0,
    },
    grandTotal: {
      type: Number,
      required: true,
      min: 0,
    },
    roundOff: {
      type: Number,
      default: 0,
    },
    finalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentStatus: {
      type: String,
      enum: {
        values: ['pending', 'partial', 'paid'],
        message: 'Payment status must be pending, partial, or paid',
      },
      default: 'pending',
      index: true,
    },
    status: {
      type: String,
      enum: {
        values: ['active', 'cancelled'],
        message: 'Bill status must be active or cancelled',
      },
      default: 'active',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

billSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Bill', billSchema);
