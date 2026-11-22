const { getNextSequence } = require('../utils/counter');
const Bill = require('../models/Bill');
const Order = require('../models/Order');
const Table = require('../models/Table');
const Payment = require('../models/Payment');
const { successResponse, errorResponse } = require('../utils/apiResponse');

// Helper to compute tax and totals
/* Compute financial values using integer paise to avoid floating‑point errors */
const computeBillFinancials = (subtotal, discountType = 'fixed', discountValue = 0) => {
  // Convert rupee values to paise (integer) for safe arithmetic
  const toPaise = (num) => Math.round(parseFloat(num) * 100);
  const fromPaise = (int) => (int / 100).toFixed(2);

  const subPaise = toPaise(subtotal);
  const dVal = parseFloat(discountValue) || 0;

  let discountPaise = 0;

  if (discountType === 'percentage') {
    // percentage discount on subtotal
    discountPaise = Math.round((subPaise * Math.min(100, dVal)) / 100);
  } else {
    // fixed discount in rupees -> convert to paise and cap at subtotal
    const fixedPaise = toPaise(dVal);
    discountPaise = Math.min(subPaise, fixedPaise);
  }

  const taxablePaise = Math.max(0, subPaise - discountPaise);
  const cgstPaise = Math.round((taxablePaise * 2.5) / 100);
  const sgstPaise = Math.round((taxablePaise * 2.5) / 100);
  const grandTotalPaise = taxablePaise + cgstPaise + sgstPaise;
  const finalAmount = Math.round(grandTotalPaise / 100); // round to nearest rupee
  const roundOffPaise = (finalAmount * 100) - grandTotalPaise; // may be negative

  return {
    subtotal: parseFloat(fromPaise(subPaise)),
    discountType,
    discountValue: dVal,
    discountAmount: parseFloat(fromPaise(discountPaise)),
    taxableAmount: parseFloat(fromPaise(taxablePaise)),
    cgst: parseFloat(fromPaise(cgstPaise)),
    sgst: parseFloat(fromPaise(sgstPaise)),
    grandTotal: parseFloat(fromPaise(grandTotalPaise)),
    roundOff: parseFloat((roundOffPaise / 100).toFixed(2)),
    finalAmount,
  };
};

// GET /api/bills
const getBills = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      paymentStatus,
      orderType,
      search,
      startDate,
      endDate,
    } = req.query;

    const query = {};
    if (status && status !== 'All') query.status = status;
    if (paymentStatus && paymentStatus !== 'All') query.paymentStatus = paymentStatus;
    if (orderType && orderType !== 'All') query.orderType = orderType;

    // Date range filtering
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        query.createdAt.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

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
      .populate('cancelledBy', 'name username')
      .populate('order')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Attach payments and payment modes to each bill
    const billIds = bills.map((b) => b._id);
    const payments = await Payment.find({ bill: { $in: billIds } });
    const paymentsByBill = {};
    payments.forEach((p) => {
      const bId = p.bill.toString();
      if (!paymentsByBill[bId]) paymentsByBill[bId] = [];
      paymentsByBill[bId].push(p);
    });

    const billsWithPayments = bills.map((b) => {
      const billObj = b.toObject();
      const bPayments = paymentsByBill[b._id.toString()] || [];
      billObj.payments = bPayments;
      const modes = [...new Set(bPayments.map((p) => p.paymentMode).filter(Boolean))];
      billObj.paymentMode = modes.length > 1 ? 'split' : modes[0] || 'cash';
      billObj.paymentModes = modes;
      return billObj;
    });

    return successResponse(res, 200, 'Bills retrieved successfully', billsWithPayments, {
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
      .populate('cancelledBy', 'name username')
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

    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    // Generate sequential bill number using atomic counter
const seq = await getNextSequence('bill');
const billNumber = `BILL-${todayStr}-${seq.toString().padStart(4, '0')}`;

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

    let paymentList = [];
    if (Array.isArray(splitPayments) && splitPayments.length > 0) {
      paymentList = splitPayments;
    } else if (paymentMode && amount !== undefined) {
      paymentList = [{ paymentMode, amount: Number(amount) }];
    } else {
      return errorResponse(res, 400, 'Please provide payment mode and amount or split payments array');
    }

    // Validate each payment entry
    for (const p of paymentList) {
      if (!['cash', 'upi', 'card'].includes(p.paymentMode)) {
        return errorResponse(res, 400, `Invalid payment mode: ${p.paymentMode}. Allowed: cash, upi, card`);
      }
      if (Number(p.amount) <= 0) {
        return errorResponse(res, 400, 'Payment amount must be greater than 0');
      }
    }

    if (tenderedAmount !== undefined && tenderedAmount !== null && paymentMode === 'cash') {
      if (Number(tenderedAmount) < Number(amount)) {
        return errorResponse(res, 400, `Cash received (₹${tenderedAmount}) cannot be less than payment amount (₹${amount})`);
      }
    }

    // Compute prospective total after adding new payments
    const existingPayments = await Payment.find({ bill: bill._id });
    const existingTotal = existingPayments.reduce((sum, p) => sum + p.amount, 0);
    const newPaymentsSum = paymentList.reduce((sum, p) => sum + Number(p.amount), 0);
    const prospectiveTotal = existingTotal + newPaymentsSum;

    if (prospectiveTotal > bill.finalAmount) {
      return errorResponse(res, 400, `Overpayment detected. Bill total is ${bill.finalAmount}, attempted to pay ${prospectiveTotal}.`);
    }

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

    let changeDue = 0;
    if (tenderedAmount && Number(tenderedAmount) > totalPaid) {
      // Change is based on finalAmount, not totalPaid, to avoid returning excess
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

// PUT /api/bills/:id/cancel (Cancel / Void Bill)
const cancelBill = async (req, res, next) => {
  try {
    const { cancellationReason = 'Customer void request' } = req.body;

    const bill = await Bill.findById(req.params.id);
    if (!bill) {
      return errorResponse(res, 404, 'Bill not found');
    }

    if (bill.status === 'cancelled') {
      return errorResponse(res, 400, 'Bill is already cancelled');
    }

    bill.status = 'cancelled';
    bill.cancellationReason = cancellationReason.trim();
    bill.cancelledBy = req.user._id;
    bill.cancelledAt = new Date();

    await bill.save();

    // Consistently update associated order & table state
    if (bill.order) {
      const order = await Order.findById(bill.order);
      if (order && order.status !== 'cancelled') {
        order.status = 'cancelled';
        await order.save();
        if (order.table) {
          await Table.findByIdAndUpdate(order.table, {
            status: 'free',
            currentOrder: null,
          });
        }
      }
    }

    const populatedBill = await Bill.findById(bill._id)
      .populate('cashier', 'name username')
      .populate('cancelledBy', 'name username');

    return successResponse(res, 200, 'Bill cancelled successfully', populatedBill);
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
  cancelBill,
};
