const rateLimit = require('express-rate-limit');

// Global rate limiter (already used in server.js)
// Export only the login specific limiter to avoid circular deps
const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: process.env.NODE_ENV === 'production' ? 20 : 500, // generous limit for POS testing and multi-staff shifts
  message: { success: false, message: 'Too many login attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { loginLimiter };
