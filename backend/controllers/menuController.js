const MenuItem = require('../models/MenuItem');
const { successResponse, errorResponse } = require('../utils/apiResponse');

// GET /api/menu
const getMenuItems = async (req, res, next) => {
  try {
    const { category, search, foodType, isAvailable } = req.query;
    const query = {};

    if (category && category !== 'All') query.category = category;
    if (foodType && foodType !== 'All') query.foodType = foodType;
    if (isAvailable !== undefined && isAvailable !== '') {
      query.isAvailable = isAvailable === 'true';
    }
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    const items = await MenuItem.find(query).sort({ category: 1, name: 1 });
    return successResponse(res, 200, 'Menu items retrieved successfully', items);
  } catch (error) {
    next(error);
  }
};

// POST /api/menu (Admin only)
const createMenuItem = async (req, res, next) => {
  try {
    const { name, category, price, foodType, isAvailable = true } = req.body;
    if (!name || !category || price === undefined || !foodType) {
      return errorResponse(res, 400, 'Please provide name, category, price and foodType');
    }

    const item = await MenuItem.create({
      name: name.trim(),
      category,
      price: Number(price),
      foodType,
      isAvailable: Boolean(isAvailable),
    });
    return successResponse(res, 201, 'Menu item created successfully', item);
  } catch (error) {
    next(error);
  }
};

// PUT /api/menu/:id (Admin only)
const updateMenuItem = async (req, res, next) => {
  try {
    const updateData = { ...req.body };
    if (updateData.price !== undefined) {
      updateData.price = Number(updateData.price);
    }

    const item = await MenuItem.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });
    if (!item) {
      return errorResponse(res, 404, 'Menu item not found');
    }
    return successResponse(res, 200, 'Menu item updated successfully', item);
  } catch (error) {
    next(error);
  }
};

// PATCH /api/menu/:id/toggle-availability (Admin only)
const toggleAvailability = async (req, res, next) => {
  try {
    const item = await MenuItem.findById(req.params.id);
    if (!item) {
      return errorResponse(res, 404, 'Menu item not found');
    }
    item.isAvailable = !item.isAvailable;
    await item.save();
    return successResponse(res, 200, `Item marked as ${item.isAvailable ? 'Available' : 'Unavailable'}`, item);
  } catch (error) {
    next(error);
  }
};

// DELETE /api/menu/:id (Admin only)
const deleteMenuItem = async (req, res, next) => {
  try {
    const item = await MenuItem.findByIdAndDelete(req.params.id);
    if (!item) {
      return errorResponse(res, 404, 'Menu item not found');
    }
    return successResponse(res, 200, 'Menu item deleted successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMenuItems,
  createMenuItem,
  updateMenuItem,
  toggleAvailability,
  deleteMenuItem,
};
