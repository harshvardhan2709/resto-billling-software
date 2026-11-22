const rateLimit = require('express-rate-limit');

// Global rate limiter (already used in server.js)
// Export only the login specific limiter to avoid circular deps
const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5, // limit each IP to 5 login attempts per window
  message: { success: false, message: 'Too many login attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { loginLimiter };
