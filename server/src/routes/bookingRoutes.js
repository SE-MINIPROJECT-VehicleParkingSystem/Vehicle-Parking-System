const express = require('express');
const {
  createBooking,
  getMyBookings,
  cancelBooking
} = require('../controllers/bookingController');

const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/my', requireAuth, getMyBookings);
router.post('/', requireAuth, requireRole('Owner'), createBooking);
router.delete('/:id', requireAuth, requireRole('Owner'), cancelBooking);

module.exports = router;