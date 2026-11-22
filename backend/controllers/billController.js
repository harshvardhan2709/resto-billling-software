const Bill = require('../models/Bill');
const Order = require('../models/Order');
const Table = require('../models/Table');
const Payment = require('../models/Payment');
const { successResponse, errorResponse } = require('../utils/apiResponse');

// Helper to compute tax and totals
const computeBillFinancials = (subtotal, discountType = 'fixed', discountValue = 0) => {
  const dVal = Math.max(0, Number(discountValue) || 0);
  let discountAmount = 0;

  if (discountType === 'percentage') {
    discountAmount = parseFloat(((subtotal * Math.min(100, dVal)) / 100).toFixed(2));
  } else {
    discountAmount = parseFloat(Math.min(subtotal, dVal).toFixed(2));
  }

  const taxableAmount = parseFloat(Math.max(0, subtotal - discountAmount).toFixed(2));
  const cgst = parseFloat(((taxableAmount * 2.5) / 100).toFixed(2)); // 2.5% CGST
  const sgst = parseFloat(((taxableAmount * 2.5) / 100).toFixed(2)); // 2.5% SGST
  const grandTotal = parseFloat((taxableAmount + cgst + sgst).toFixed(2));
  const finalAmount = Math.round(grandTotal);
  const roundOff = parseFloat((finalAmount - grandTotal).toFixed(2));

  return {
    subtotal,
    discountType,
    discountValue: dVal,
    discountAmount,
    taxableAmount,
    cgst,
    sgst,
    grandTotal,
    roundOff,
    finalAmount,
  };
};

// GET /api/bills
const getBills = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, paymentStatus, search } = req.query;
    const query = {};
    if (status && status !== 'All') query.status = status;
    if (paymentStatus && paymentStatus !== 'All') query.paymentStatus = paymentStatus;
    if (search) {
      query.$or = [
        { billNumber: { $regex: search, $options: 'i' } },
        { tableNumber: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Bill.countDocuments(query);
    const bills = await Bill.find(query)
      .populate('cashier', 'name username')
      .populate('order')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    return successResponse(res, 200, 'Bills retrieved successfully', bills, {
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/bills/:id
const getBillById = async (req, res, next) => {
  try {
    const bill = await Bill.findById(req.params.id)
      .populate('cashier', 'name username')
      .populate('order');

    if (!bill) {
      return errorResponse(res, 404, 'Bill not found');
    }

    const payments = await Payment.find({ bill: bill._id })
      .populate('receivedBy', 'name username')
      .sort({ createdAt: 1 });

    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const balanceDue = Math.max(0, bill.finalAmount - totalPaid);

    return successResponse(res, 200, 'Bill fetched successfully', {
      ...bill.toObject(),
      payments,
      totalPaid,
      balanceDue,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/bills/preview (Calculate preview before saving)
const previewBill = async (req, res, next) => {
  try {
    const { orderId, discountType = 'fixed', discountValue = 0 } = req.body;

    const order = await Order.findById(orderId).populate('table');
    if (!order) {
      return errorResponse(res, 404, 'Order not found');
    }

    const financials = computeBillFinancials(order.subtotal, discountType, discountValue);

    return successResponse(res, 200, 'Bill preview generated', {
      order,
      ...financials,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/bills (Generate bill)
const createBill = async (req, res, next) => {
  try {
    const { orderId, discountType = 'fixed', discountValue = 0 } = req.body;

    const order = await Order.findById(orderId).populate('table');
    if (!order) {
      return errorResponse(res, 404, 'Order not found');
    }

    if (order.status === 'billed') {
      return errorResponse(res, 400, 'Order has already been billed');
    }

    const financials = computeBillFinancials(order.subtotal, discountType, discountValue);

    // Format: BILL-YYYYMMDD-XXXX
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const billNumber = `BILL-${todayStr}-${randomSuffix}`;

    const bill = await Bill.create({
      billNumber,
      order: order._id,
      cashier: req.user._id,
      orderType: order.orderType,
      tableNumber: order.table ? order.table.tableNumber : 'Takeaway',
      items: order.items.map((i) => ({
        menuItem: i.menuItem,
        name: i.name,
        quantity: i.quantity,
        price: i.price,
        total: i.total,
      })),
      ...financials,
      paymentStatus: 'pending',
      status: 'active',
    });

    order.status = 'billed';
    await order.save();

    if (order.table) {
      await Table.findByIdAndUpdate(order.table._id, {
        status: 'free',
        currentOrder: null,
      });
    }

    const populatedBill = await Bill.findById(bill._id).populate('cashier', 'name username');

    return successResponse(res, 201, 'Bill generated successfully', populatedBill);
  } catch (error) {
    next(error);
  }
};

// POST /api/bills/:id/payments (Record single or split payments)
const recordPayment = async (req, res, next) => {
  try {
    const bill = await Bill.findById(req.params.id);
    if (!bill) {
      return errorResponse(res, 404, 'Bill not found');
    }

    if (bill.status === 'cancelled') {
      return errorResponse(res, 400, 'Cannot accept payment for a cancelled bill');
    }

    const { paymentMode, amount, payments: splitPayments, tenderedAmount } = req.body;

    // Normalizing payments list
    let paymentList = [];
    if (Array.isArray(splitPayments) && splitPayments.length > 0) {
      paymentList = splitPayments;
    } else if (paymentMode && amount !== undefined) {
      paymentList = [{ paymentMode, amount: Number(amount) }];
    } else {
      return errorResponse(res, 400, 'Please provide payment mode and amount or split payments array');
    }

    // Validate each payment
    for (const p of paymentList) {
      if (!['cash', 'upi', 'card'].includes(p.paymentMode)) {
        return errorResponse(res, 400, `Invalid payment mode: ${p.paymentMode}. Allowed: cash, upi, card`);
      }
      if (Number(p.amount) <= 0) {
        return errorResponse(res, 400, 'Payment amount must be greater than 0');
      }
    }

    // Create payment records
    const createdPayments = [];
    for (const p of paymentList) {
      const paymentDoc = await Payment.create({
        bill: bill._id,
        paymentMode: p.paymentMode,
        amount: Number(p.amount),
        receivedBy: req.user._id,
      });
      createdPayments.push(paymentDoc);
    }

    // Calculate total payments made for this bill
    const allBillPayments = await Payment.find({ bill: bill._id });
    const totalPaid = allBillPayments.reduce((sum, p) => sum + p.amount, 0);

    if (totalPaid >= bill.finalAmount) {
      bill.paymentStatus = 'paid';
    } else if (totalPaid > 0) {
      bill.paymentStatus = 'partial';
    } else {
      bill.paymentStatus = 'pending';
    }

    await bill.save();

    // Tendered calculation for Cash change
    let changeDue = 0;
    if (tenderedAmount && Number(tenderedAmount) > totalPaid) {
      changeDue = parseFloat((Number(tenderedAmount) - bill.finalAmount).toFixed(2));
    }

    return successResponse(res, 200, 'Payment recorded successfully', {
      bill,
      newPayments: createdPayments,
      totalPaid,
      balanceDue: Math.max(0, bill.finalAmount - totalPaid),
      changeDue: Math.max(0, changeDue),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getBills,
  getBillById,
  previewBill,
  createBill,
  recordPayment,
};
