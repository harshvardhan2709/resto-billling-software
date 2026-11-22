const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    menuItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MenuItem',
      required: true,
    },
    name: {
      type: String,
      required: true, // Snapshot of item name at order time
      trim: true,
    },
    price: {
      type: Number,
      required: true, // Snapshot of item price at order time
      min: 0,
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1'],
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: [true, 'Order number is required'],
      unique: true,
      trim: true,
      index: true,
    },
    orderType: {
      type: String,
      required: [true, 'Order type is required'],
      enum: {
        values: ['dine-in', 'takeaway'],
        message: 'Order type must be dine-in or takeaway',
      },
      default: 'dine-in',
    },
    table: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Table',
      default: null, // Nullable for takeaway orders
    },
    items: {
      type: [orderItemSchema],
      validate: {
        validator: function (v) {
          return Array.isArray(v) && v.length > 0;
        },
        message: 'Order must contain at least one item',
      },
    },
    status: {
      type: String,
      enum: {
        values: ['open', 'billed', 'cancelled'],
        message: 'Status must be open, billed, or cancelled',
      },
      default: 'open',
      index: true,
    },
    cashier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Cashier reference is required'],
    },
    subtotal: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

orderSchema.index({ createdAt: -1 });
orderSchema.index({ table: 1, status: 1 });

module.exports = mongoose.model('Order', orderSchema);
