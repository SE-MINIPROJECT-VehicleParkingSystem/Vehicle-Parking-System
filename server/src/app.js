const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');

const adminRoutes = require('./routes/adminRoutes');
const authRoutes = require('./routes/authRoutes');
const entryRoutes = require('./routes/entryRoutes');
const exitRoutes = require('./routes/exitRoutes');
const slotRoutes = require('./routes/slotRoutes');
const {
  sendSuccess,
  sendError,
} = require('./utils/apiResponse');

const app = express();

// Required when running behind Render's reverse proxy.
// This allows express-rate-limit to identify client IPs correctly.
app.set('trust proxy', 1);

// Security headers
app.use(helmet());

// Parse HTTP-only authentication cookies
app.use(cookieParser());

// Allow requests from the configured frontend origin
app.use(
  cors({
    origin:
      process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    credentials: true,
  })
);

// Parse JSON request bodies
app.use(express.json({ limit: '20kb' }));

// Health check
app.get('/api/health', (_req, res) => {
  return sendSuccess(res, 'API is running.', {
    service: 'vehicle-parking-api',
  });
});

// Authentication routes
app.use('/api/auth', authRoutes);
app.use('/api/entries', entryRoutes);
app.use('/api/exits', exitRoutes);
app.use('/api/slots', slotRoutes);

app.use('/api/admin', adminRoutes);

// Handle unknown routes
app.use((_req, res) => {
  return sendError(res, 'Route not found.', 404);
});

// Central error handler
app.use((err, _req, res, _next) => {
  if (err && err.type === 'entity.parse.failed') {
    return sendError(
      res,
      'Request body must be valid JSON.',
      400
    );
  }

  if (err && err.name === 'ValidationError') {
    return sendError(
      res,
      'Submitted data failed validation.',
      400
    );
  }

  if (err && err.code === 11000) {
    return sendError(
      res,
      'A record with that unique value already exists.',
      409
    );
  }

  console.error(err);

  return sendError(res, 'Internal server error.', 500);
});

module.exports = app;