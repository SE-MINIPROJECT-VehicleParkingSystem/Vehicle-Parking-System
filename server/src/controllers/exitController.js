const ParkingSlot = require('../models/ParkingSlot');
const ParkingTransaction = require('../models/ParkingTransaction');
const { normalizePlate, isValidPlate } = require('../utils/validators');
const { sendSuccess, sendError } = require('../utils/apiResponse');

// Frees the slot after the session is closed. Never throws: the exit has already
// been recorded, so a failed release is logged loudly and reported to the caller.
async function releaseSlot(slotId) {
  try {
    await ParkingSlot.updateOne({ slotId, status: 'Occupied' }, { status: 'Available' });
    return true;
  } catch (releaseError) {
    console.error(
      `CRITICAL: session closed but slot ${slotId} could not be released; it may be stuck as Occupied.`,
      releaseError
    );
    return false;
  }
}

async function recordExit(req, res, next) {
  try {
    // 1. Validate the vehicle identifier
    const numberPlate = normalizePlate(req.body?.numberPlate);
    if (!isValidPlate(numberPlate)) {
      return sendError(res, 'Number plate must be 4 to 15 letters or digits.', 400);
    }

    // 2. Find the active session AND close it in one atomic update.
    //    Only a session with no exit time can match, so a closed session can never be
    //    processed again, and two simultaneous exit requests cannot both succeed.
    const session = await ParkingTransaction.findOneAndUpdate(
      { vehicleNumberPlate: numberPlate, exitTime: null },
      { exitTime: new Date() },
      { new: true }
    );

    if (!session) {
      // Tell "already exited" apart from "never entered" so staff get a useful message.
      const closed = await ParkingTransaction.findOne({
        vehicleNumberPlate: numberPlate,
        exitTime: { $ne: null },
      })
        .sort({ exitTime: -1 })
        .lean();
      if (closed) {
        return sendError(
          res,
          'This vehicle\'s parking session is already closed. It cannot be exited again.',
          409
        );
      }
      return sendError(res, 'No active parking session found for this vehicle.', 404);
    }

    // 3. Release the slot (the session is already closed at this point)
    const slotReleased = await releaseSlot(session.slotId);

    const durationMinutes = Math.max(
      1,
      Math.ceil((new Date(session.exitTime) - new Date(session.entryTime)) / 60000)
    );

    const message = slotReleased
      ? 'Vehicle exit recorded. Session closed.'
      : `Vehicle exit recorded and session closed, but slot ${session.slotId} could not be released automatically. Please ask an administrator to free it.`;

    return sendSuccess(res, message, {
      transactionId: session.transactionId,
      entryTicketNumber: session.entryTicketNumber,
      numberPlate: session.vehicleNumberPlate,
      vehicleType: session.vehicleType,
      slotId: session.slotId,
      entryTime: session.entryTime,
      exitTime: session.exitTime,
      durationMinutes,
      slotReleased,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { recordExit };