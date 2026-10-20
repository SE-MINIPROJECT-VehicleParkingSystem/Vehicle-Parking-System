
const express = require('express');
const rateLimit = require('express-rate-limit');
const {
  register,
  login,
  logout,
  getCurrentUser
} = require('../controllers/authController');

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

router.post('/register', limiter, register);
router.post('/login', limiter, login);
router.post('/logout', logout);
router.get('/me', getCurrentUser);

module.exports = router;
