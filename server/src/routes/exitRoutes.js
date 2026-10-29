const express = require('express');

const {
  recordExit,
  getReceipt,
} = require('../controllers/exitController');

const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Record a vehicle exit
router.post(
  '/',
  requireAuth,
  requireRole('Staff', 'Admin'),
  recordExit
);

// Retrieve a saved parking receipt
router.get(
  '/:transactionId/receipt',
  requireAuth,
  requireRole('Staff', 'Admin'),
  getReceipt
);

module.exports = router;