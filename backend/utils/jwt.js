const jwt = require('jsonwebtoken');

const signToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET || 'default_jwt_secret', {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET || 'default_jwt_secret');
};

/**
 * Attaches JWT token to HttpOnly cookie and sends standardized JSON response
 */
const sendTokenResponse = (user, statusCode, res, message = 'Authentication successful') => {
  const payload = {
    id: user._id,
    role: user.role,
  };

  const token = signToken(payload);

  const cookieOptions = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  };

  const sanitizedUser = {
    id: user._id,
    name: user.name,
    username: user.username,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
  };

  res.cookie('token', token, cookieOptions);

  return res.status(statusCode).json({
    success: true,
    message,
    token, // Also return bearer token for header-based API clients/testing
    user: sanitizedUser,
  });
};

module.exports = {
  signToken,
  verifyToken,
  sendTokenResponse,
};
