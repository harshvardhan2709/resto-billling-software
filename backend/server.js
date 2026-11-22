require('dotenv').config();

// Environment validation
const requiredEnv = ['JWT_SECRET', 'MONGO_URI'];
requiredEnv.forEach((key) => {
  if (!process.env[key]) {
    console.error(`❌ Fatal: Required environment variable ${key} is missing.`);
    process.exit(1);
  }
});

// Validate PORT if provided
if (process.env.PORT && isNaN(parseInt(process.env.PORT, 10))) {
  console.error('❌ Fatal: PORT must be a numeric value.');
  process.exit(1);
}

// Validate CLIENT_URL – must be a valid URL if set
if (process.env.CLIENT_URL) {
  try {
    new URL(process.env.CLIENT_URL);
  } catch {
    console.error('❌ Fatal: CLIENT_URL is not a valid URL.');
    process.exit(1);
  }
}

// Core imports
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// Route handlers
const authRoutes = require('./routes/authRoutes');
const menuRoutes = require('./routes/menuRoutes');
const tableRoutes = require('./routes/tableRoutes');
const orderRoutes = require('./routes/orderRoutes');
const billRoutes = require('./routes/billRoutes');
const reportRoutes = require('./routes/reportRoutes');

const app = express();

// Security middlewares
app.use(helmet());
app.use(mongoSanitize());
// Body parsers with size limit
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// Global rate limiter – 2000 req / 15 min per IP in dev/test, 500 in prod
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: process.env.NODE_ENV === 'production' ? 500 : 2000,
    message: { success: false, message: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// Login specific limiter (exported)
const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 20 : 500,
  message: { success: false, message: 'Too many login attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
module.exports.loginLimiter = loginLimiter;

// CORS configuration – single definition
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  process.env.CLIENT_URL,
].filter(Boolean);
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Blocked by CORS policy'));
    },
    credentials: true,
  })
);

// Dev logger
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Health check endpoint
const checkHealth = (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;

  if (isDbConnected) {
    return res.status(200).json({
      success: true,
      message: 'Server is healthy',
      database: 'connected',
    });
  }

  return res.status(503).json({
    success: false,
    message: 'Database connection unavailable',
    database: 'disconnected',
  });
};

app.get('/health', checkHealth);
app.get('/api/health', checkHealth);

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/reports', reportRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `API endpoint not found: ${req.method} ${req.originalUrl}` });
});

// Centralized error handling
app.use(errorHandler);

// Graceful shutdown
const shutdown = () => {
  console.log('\n[Server] Gracefully shutting down...');
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Connect to DB and start server (unless in test mode)
connectDB();
const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`[Server] Restaurant Billing API running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  });
}

module.exports = app;
