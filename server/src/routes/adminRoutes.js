const express = require('express');

const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const { getDashboard } = require('../controllers/adminController');

const router = express.Router();

router.get(
  '/dashboard',
  authenticate,
  authorize('Admin'),
  getDashboard
);

module.exports = router;