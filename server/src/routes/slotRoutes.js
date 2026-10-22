const express = require('express');
const { getSlotAvailability } = require('../controllers/slotController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Any logged-in user (Owner, Staff, Admin) may view availability.
router.get('/', requireAuth, getSlotAvailability);

module.exports = router;