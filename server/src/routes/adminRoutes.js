const express = require('express');

const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

const router = express.Router();

// Protected Admin dashboard route
router.get(
  '/dashboard',
  authenticate,
  authorize('Admin'),
  (_req, res) => {
    return res.status(200).json({
      status: 'success',
      message: 'Admin dashboard access granted.',
      data: {
        role: 'Admin'
      }
    });
  }
);

module.exports = router;