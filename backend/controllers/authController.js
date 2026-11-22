const User = require('../models/User');
const { sendTokenResponse } = require('../utils/jwt');
const { successResponse, errorResponse } = require('../utils/apiResponse');

/**
 * @desc    Login user via email or username
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res, next) => {
  try {
    const { identifier, email, username, password } = req.body;
    const loginIdentifier = (identifier || email || username || '').trim();

    if (!loginIdentifier || !password) {
      return errorResponse(res, 400, 'Please provide both username/email and password.');
    }

    // Find user by either email or username (case-insensitive)
    const user = await User.findOne({
      $or: [
        { email: loginIdentifier.toLowerCase() },
        { username: loginIdentifier.toLowerCase() },
      ],
    }).select('+password');

    if (!user) {
      return errorResponse(res, 401, 'Invalid username/email or password.');
    }

    if (!user.isActive) {
      return errorResponse(res, 403, 'Your account is deactivated. Please contact the administrator.');
    }

    // Validate password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return errorResponse(res, 401, 'Invalid username/email or password.');
    }

    // Issue JWT and send response
    return sendTokenResponse(user, 200, res, `Welcome back, ${user.name}!`);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Logout current user / clear cookie
 * @route   POST /api/auth/logout
 * @access  Public / Private
 */
const logout = async (req, res) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 5 * 1000), // 5 seconds
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  });

  return successResponse(res, 200, 'User logged out successfully.');
};

/**
 * @desc    Get currently logged in user profile
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = async (req, res) => {
  const user = {
    id: req.user._id,
    name: req.user.name,
    username: req.user.username,
    email: req.user.email,
    role: req.user.role,
    isActive: req.user.isActive,
    createdAt: req.user.createdAt,
  };

  return successResponse(res, 200, 'Current user profile fetched successfully', user);
};

module.exports = {
  login,
  logout,
  getMe,
};
