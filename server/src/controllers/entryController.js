const crypto = require('crypto');
const ParkingSlot = require('../models/ParkingSlot');
const ParkingTransaction = require('../models/ParkingTransaction');
const { VEHICLE_TYPES } = require('../models/Vehicle');
const { sendSuccess, sendError } = require('../utils/apiResponse');

function normalizePlate(value) {
  return typeof value === 'string' ? value.replace(/[\s-]/g, '').toUpperCase() : '';
}

function randomHex() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

async function recordEntry(req, res, next) {
  try {
    const numberPlate = normalizePlate(req.body.numberPlate);
    const { vehicleType } = req.body;

    // 1. Validate vehicle details
    if (!/^[A-Z0-9]{4,15}$/.test(numberPlate)) {
      return sendError(res, 'Number plate must be 4 to 15 letters or digits.', 400);
    }
    if (!VEHICLE_TYPES.includes(vehicleType)) {
      return sendError(res, `Vehicle type must be one of: ${VEHICLE_TYPES.join(', ')}.`, 400);
    }

    // 2. Prevent duplicate active sessions (active = no exit time yet)
    const active = await ParkingTransaction.findOne({
      vehicleNumberPlate: numberPlate,
      exitTime: null,
    }).lean();
    if (active) {
      return sendError(res, 'This vehicle already has an active parking session.', 409);
    }

    // 3. Take the first available slot of this vehicle type (atomic)
    const slot = await ParkingSlot.findOneAndUpdate(
      { status: 'Available', vehicleType },
      { status: 'Occupied' },
      { sort: { zone: 1, slotNumber: 1 }, new: true }
    );
    if (!slot) {
      return sendError(res, 'Parking full for this vehicle type.', 409);
    }

    // 4. Create the active session (entryTime is set by the server)
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    let transaction;
    try {
      transaction = await ParkingTransaction.create({
        transactionId: `TXN-${randomHex()}`,
        entryTicketNumber: `TKT-${datePart}-${randomHex().slice(0, 4)}`,
        vehicleNumberPlate: numberPlate,
        vehicleType,
        slotId: slot.slotId,
        entryTime: new Date(),
      });
    } catch (error) {
      // Give the slot back if saving the session failed
      await ParkingSlot.updateOne({ _id: slot._id }, { status: 'Available' });
      throw error;
    }

    return sendSuccess(
      res,
      'Vehicle entry recorded.',
      {
        transactionId: transaction.transactionId,
        entryTicketNumber: transaction.entryTicketNumber,
        numberPlate: transaction.vehicleNumberPlate,
        vehicleType: transaction.vehicleType,
        slotId: transaction.slotId,
        entryTime: transaction.entryTime,
      },
      201
    );
  } catch (error) {
    return next(error);
  }
}

module.exports = { recordEntry };