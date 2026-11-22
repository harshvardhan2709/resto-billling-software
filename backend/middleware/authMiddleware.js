const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { errorResponse } = require('../utils/apiResponse');

/**
 * Protect routes: verify JWT from HttpOnly cookie or Authorization Bearer header
 */
const protect = async (req, res, next) => {
  let token = null;

  // 1. Check HttpOnly cookie
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }
  // 2. Fallback to Authorization: Bearer <token>
  else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return errorResponse(res, 401, 'Authentication required. Please log in to access this resource.');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_jwt_secret');

    // Retrieve active user by ID
    const user = await User.findById(decoded.id);
    if (!user) {
      return errorResponse(res, 401, 'User associated with this token no longer exists.');
    }

    if (!user.isActive) {
      return errorResponse(res, 403, 'Account has been deactivated. Please contact the administrator.');
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return errorResponse(res, 401, 'Session expired. Please log in again.');
    }
    return errorResponse(res, 401, 'Invalid or corrupted authentication token.');
  }
};

module.exports = {
  protect,
};
