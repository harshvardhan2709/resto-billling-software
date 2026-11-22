const Table = require('../models/Table');
const { successResponse, errorResponse } = require('../utils/apiResponse');

// GET /api/tables
const getTables = async (req, res, next) => {
  try {
    const tables = await Table.find().sort({ tableNumber: 1 }).populate('currentOrder');
    return successResponse(res, 200, 'Tables retrieved successfully', tables);
  } catch (error) {
    next(error);
  }
};

// PUT /api/tables/:id/status
const updateTableStatus = async (req, res, next) => {
  try {
    const { status, currentOrder } = req.body;
    const updateData = {};
    if (status) updateData.status = status;
    if (currentOrder !== undefined) updateData.currentOrder = currentOrder;

    const table = await Table.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!table) {
      return errorResponse(res, 404, 'Table not found');
    }
    return successResponse(res, 200, 'Table status updated successfully', table);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTables,
  updateTableStatus,
};
