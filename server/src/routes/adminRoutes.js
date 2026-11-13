
const express = require('express');

const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

const { getDashboard } = require('../controllers/adminController');
const { createStaff } = require('../controllers/staffController');

const router = express.Router();

// Admin dashboard
router.get(
  '/dashboard',
  authenticate,
  authorize('Admin'),
  getDashboard
);

// Create a Staff account
router.post(
  '/staff',
  authenticate,
  authorize('Admin'),
  createStaff
);

module.exports = router;
