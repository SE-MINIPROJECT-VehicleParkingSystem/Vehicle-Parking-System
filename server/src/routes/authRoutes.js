
const express = require('express');
const rateLimit = require('express-rate-limit');

const {
  register,
  login,
  logout,
  getCurrentUser,
  forgotPassword,
  resetPassword
} = require('../controllers/authController');

const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

const router = express.Router();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Too many authentication attempts. Try again later.',
    data: null
  }
});

// Registration and login
router.post('/register', limiter, register);
router.post('/login', limiter, login);
router.post('/logout', logout);

// Forgot and reset password
router.post('/forgot-password', limiter, forgotPassword);
router.post('/reset-password', limiter, resetPassword);

// Restore authenticated session
router.get('/me', authenticate, getCurrentUser);

// Admin-only role verification
router.get(
  '/admin-check',
  authenticate,
  authorize('Admin'),
  (_req, res) => {
    return res.status(200).json({
      status: 'success',
      message: 'Admin access granted.',
      data: null
    });
  }
);

module.exports = router;
