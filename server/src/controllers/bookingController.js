const Booking = require('../models/Booking');
const ParkingSlot = require('../models/ParkingSlot');
const { sendSuccess, sendError } = require('../utils/apiResponse');

async function createBooking(req, res, next) {
  let reservedSlot = null;

  try {
    const { slotId, vehicleNumberPlate } = req.body;
    const plate = String(vehicleNumberPlate || '').trim().toUpperCase();

    if (!slotId || typeof slotId !== 'string') {
      return sendError(res, 'Select a valid parking slot.', 400);
    }

    if (!/^[A-Z0-9]{4,15}$/.test(plate)) {
      return sendError(res, 'Enter a valid vehicle number plate.', 400);
    }

    // Atomically reserve the slot. Two customers cannot reserve it simultaneously.
    reservedSlot = await ParkingSlot.findOneAndUpdate(
      { slotId: slotId.trim(), status: 'Available' },
      { $set: { status: 'Reserved' } },
      { new: true }
    );

    if (!reservedSlot) {
      return sendError(res, 'This slot is no longer available.', 409);
    }

    const booking = await Booking.create({
      ownerId: req.user._id,
      slotId: reservedSlot.slotId,
      vehicleNumberPlate: plate,
      vehicleType: reservedSlot.vehicleType
    });

    return sendSuccess(res, 'Parking slot booked successfully.', {
      booking
    }, 201);
  } catch (error) {
    // If booking creation fails, release the slot we reserved.
    if (reservedSlot) {
      await ParkingSlot.updateOne(
        { _id: reservedSlot._id, status: 'Reserved' },
        { $set: { status: 'Available' } }
      );
    }

    if (error.code === 11000) {
      return sendError(
        res,
        'You already have an active booking for this vehicle, or the slot is booked.',
        409
      );
    }

    return next(error);
  }
}

async function getMyBookings(req, res, next) {
  try {
    const bookings = await Booking.find({
      ownerId: req.user._id
    }).sort({ bookingTime: -1 }).lean();

    return sendSuccess(res, 'Your bookings retrieved.', { bookings });
  } catch (error) {
    return next(error);
  }
}

async function cancelBooking(req, res, next) {
  try {
    const booking = await Booking.findOneAndUpdate(
      {
        _id: req.params.id,
        ownerId: req.user._id,
        status: 'Booked'
      },
      { $set: { status: 'Cancelled' } },
      { new: true }
    );

    if (!booking) {
      return sendError(
        res,
        'Active booking not found. It may already be cancelled or may not belong to you.',
        404
      );
    }

    const released = await ParkingSlot.updateOne(
      { slotId: booking.slotId, status: 'Reserved' },
      { $set: { status: 'Available' } }
    );

    if (released.modifiedCount !== 1) {
      console.error(`Booking ${booking._id} cancelled, but slot ${booking.slotId} was not released.`);
      return sendError(
        res,
        'Booking was cancelled, but the slot could not be released automatically. Contact an administrator.',
        500
      );
    }

    return sendSuccess(res, 'Booking cancelled and slot released.', {
      booking
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createBooking,
  getMyBookings,
  cancelBooking
};