
const express = require('express');
const rateLimit = require('express-rate-limit');

const {
  register,
  login,
  logout,
  getCurrentUser,
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
    data: null,
  },
});

router.post('/register', limiter, register);
router.post('/login', limiter, login);
router.post('/logout', logout);

// Any authenticated, active user can restore their session.
router.get('/me', authenticate, getCurrentUser);

// Example route to verify role-based access.
// Only Admin users can access it.
router.get(
  '/admin-check',
  authenticate,
  authorize('Admin'),
  (_req, res) => {
    return res.status(200).json({
      status: 'success',
      message: 'Admin access granted.',
      data: null,
    });
  }
);

module.exports = router;
