const crypto = require('crypto');
const ParkingSlot = require('../models/ParkingSlot');
const ParkingTransaction = require('../models/ParkingTransaction');
const { VEHICLE_TYPES } = require('../models/Vehicle');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const { normalizePlate, isValidPlate } = require('../utils/validators');

const MAX_ID_ATTEMPTS = 3;

function randomHex(bytes) {
  return crypto.randomBytes(bytes).toString('hex').toUpperCase();
}

// TXN-<16 hex> = 20 chars (limit 24); TKT-YYMMDD-<8 hex> = 19 chars (limit 20)
function newIds() {
  const datePart = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  return {
    transactionId: `TXN-${randomHex(8)}`,
    entryTicketNumber: `TKT-${datePart}-${randomHex(4)}`,
  };
}

// Returns the field name that caused a MongoDB duplicate-key error, or null.
function duplicateField(error) {
  if (!error || error.code !== 11000) return null;
  const keys = Object.keys(error.keyPattern || error.keyValue || {});
  return keys[0] || 'unknown';
}

// Retries with fresh IDs only when an ID collides; any other error is rethrown.
async function createSession(fields) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await ParkingTransaction.create({ ...newIds(), ...fields });
    } catch (error) {
      const field = duplicateField(error);
      const idCollision = field === 'transactionId' || field === 'entryTicketNumber';
      if (!idCollision || attempt >= MAX_ID_ATTEMPTS) throw error;
    }
  }
}

// Never throws, so the original error is not hidden by a failed release.
async function releaseSlot(slot) {
  try {
    await ParkingSlot.updateOne({ _id: slot._id }, { status: 'Available' });
    return true;
  } catch (releaseError) {
    console.error(
      `CRITICAL: could not release slot ${slot.slotId}; it may be stuck as Occupied.`,
      releaseError
    );
    return false;
  }
}

async function recordEntry(req, res, next) {
  try {
    const numberPlate = normalizePlate(req.body.numberPlate);
    const { vehicleType } = req.body;

    // 1. Validate vehicle details
    if (!isValidPlate(numberPlate)) {
      return sendError(res, 'Number plate must be 4 to 15 letters or digits.', 400);
    }
    if (!VEHICLE_TYPES.includes(vehicleType)) {
      return sendError(res, `Vehicle type must be one of: ${VEHICLE_TYPES.join(', ')}.`, 400);
    }

    // 2. Fast-path duplicate check (the unique index below is the real guarantee)
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

    // 4. Create the active session
    let transaction;
    try {
      transaction = await createSession({
        vehicleNumberPlate: numberPlate,
        vehicleType,
        slotId: slot.slotId,
        entryTime: new Date(),
      });
    } catch (error) {
      await releaseSlot(slot);
      // A concurrent request for the same plate won the race
      if (duplicateField(error) === 'vehicleNumberPlate') {
        return sendError(res, 'This vehicle already has an active parking session.', 409);
      }
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