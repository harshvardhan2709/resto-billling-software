const Order = require('../models/Order');
const Table = require('../models/Table');
const { successResponse, errorResponse } = require('../utils/apiResponse');

// GET /api/orders
const getOrders = async (req, res, next) => {
  try {
    const { status, orderType } = req.query;
    const query = {};
    if (status) query.status = status;
    if (orderType) query.orderType = orderType;

    const orders = await Order.find(query)
      .populate('table')
      .populate('cashier', 'name username')
      .sort({ createdAt: -1 });

    return successResponse(res, 200, 'Orders retrieved successfully', orders);
  } catch (error) {
    next(error);
  }
};

// GET /api/orders/:id
const getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('table')
      .populate('cashier', 'name username');

    if (!order) {
      return errorResponse(res, 404, 'Order not found');
    }

    return successResponse(res, 200, 'Order retrieved successfully', order);
  } catch (error) {
    next(error);
  }
};

// POST /api/orders
const createOrder = async (req, res, next) => {
  try {
    const { orderType = 'dine-in', tableId, items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return errorResponse(res, 400, 'Order must contain at least one item');
    }

    // If dine-in, check table availability
    let table = null;
    if (orderType === 'dine-in') {
      if (!tableId) {
        return errorResponse(res, 400, 'Table selection is required for dine-in orders');
      }
      table = await Table.findById(tableId);
      if (!table) {
        return errorResponse(res, 404, 'Selected table does not exist');
      }
      if (table.status === 'running') {
        return errorResponse(res, 400, `Table ${table.tableNumber} already has an active running order`);
      }
    }

    // Calculate subtotal with snapshot prices
    const formattedItems = items.map((item) => ({
      menuItem: item.menuItem || item._id,
      name: item.name,
      price: Number(item.price),
      quantity: Number(item.quantity) || 1,
      total: Number(item.price) * (Number(item.quantity) || 1),
    }));

    const subtotal = formattedItems.reduce((sum, item) => sum + item.total, 0);
    const orderNumber = `ORD-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

    const order = await Order.create({
      orderNumber,
      orderType,
      table: orderType === 'dine-in' ? tableId : null,
      items: formattedItems,
      subtotal,
      cashier: req.user._id,
      status: 'open',
    });

    if (orderType === 'dine-in' && table) {
      table.status = 'running';
      table.currentOrder = order._id;
      await table.save();
    }

    const populatedOrder = await Order.findById(order._id)
      .populate('table')
      .populate('cashier', 'name username');

    return successResponse(res, 201, 'Order created successfully', populatedOrder);
  } catch (error) {
    next(error);
  }
};

// PUT /api/orders/:id/add-items (Append items to running order)
const addItemsToOrder = async (req, res, next) => {
  try {
    const { items: newItems } = req.body;

    if (!newItems || !Array.isArray(newItems) || newItems.length === 0) {
      return errorResponse(res, 400, 'Please provide items to add');
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return errorResponse(res, 404, 'Order not found');
    }

    if (order.status !== 'open') {
      return errorResponse(res, 400, `Cannot add items to order with status '${order.status}'`);
    }

    // Merge or append items
    for (const newItem of newItems) {
      const targetId = (newItem.menuItem || newItem._id).toString();
      const existingItemIndex = order.items.findIndex(
        (i) => i.menuItem.toString() === targetId
      );

      const qty = Number(newItem.quantity) || 1;
      const price = Number(newItem.price);

      if (existingItemIndex > -1) {
        order.items[existingItemIndex].quantity += qty;
        order.items[existingItemIndex].total = order.items[existingItemIndex].quantity * price;
      } else {
        order.items.push({
          menuItem: newItem.menuItem || newItem._id,
          name: newItem.name,
          price,
          quantity: qty,
          total: price * qty,
        });
      }
    }

    order.subtotal = order.items.reduce((sum, item) => sum + item.total, 0);
    await order.save();

    const populatedOrder = await Order.findById(order._id)
      .populate('table')
      .populate('cashier', 'name username');

    return successResponse(res, 200, 'Items added to order successfully', populatedOrder);
  } catch (error) {
    next(error);
  }
};

// PUT /api/orders/:id/cancel
const cancelOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return errorResponse(res, 404, 'Order not found');
    }

    if (order.status !== 'open') {
      return errorResponse(res, 400, `Cannot cancel order with status '${order.status}'`);
    }

    order.status = 'cancelled';
    await order.save();

    // Release table if dine-in
    if (order.table) {
      await Table.findByIdAndUpdate(order.table, {
        status: 'free',
        currentOrder: null,
      });
    }

    return successResponse(res, 200, 'Order cancelled successfully', order);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getOrders,
  getOrderById,
  createOrder,
  addItemsToOrder,
  cancelOrder,
};
