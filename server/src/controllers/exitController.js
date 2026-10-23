const ParkingSlot = require('../models/ParkingSlot');
const ParkingTransaction = require('../models/ParkingTransaction');
const { normalizePlate, isValidPlate } = require('../utils/validators');
const { calculateFee } = require('../utils/feeCalculator');
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

// Stores the calculated fee on the closed session. Never throws: the fee is still
// returned to staff, and a failed save is logged loudly.
async function saveFee(transactionId, fee) {
  try {
    await ParkingTransaction.updateOne({ transactionId }, { fee });
    return true;
  } catch (saveError) {
    console.error(
      `CRITICAL: session ${transactionId} closed but its fee (${fee}) could not be saved.`,
      saveError
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

    // 3. Calculate the fee on the server from the entry and exit times (never from the client)
    const billing = calculateFee(session.entryTime, session.exitTime, session.vehicleType);

    // 4. Release the slot and store the fee (the session is already closed at this point)
    const slotReleased = await releaseSlot(session.slotId);
    const feeRecorded = await saveFee(session.transactionId, billing.fee);

    const warnings = [];
    if (!slotReleased) {
      warnings.push(
        `Slot ${session.slotId} could not be released automatically. Please ask an administrator to free it.`
      );
    }
    if (!feeRecorded) {
      warnings.push('The fee could not be saved. Please ask an administrator to check this session.');
    }
    const message = warnings.length
      ? `Vehicle exit recorded and session closed, but: ${warnings.join(' ')}`
      : 'Vehicle exit recorded. Session closed.';

    return sendSuccess(res, message, {
      transactionId: session.transactionId,
      entryTicketNumber: session.entryTicketNumber,
      numberPlate: session.vehicleNumberPlate,
      vehicleType: session.vehicleType,
      slotId: session.slotId,
      entryTime: session.entryTime,
      exitTime: session.exitTime,
      durationMinutes: billing.durationMinutes,
      billedHours: billing.billedHours,
      ratePerHour: billing.ratePerHour,
      fee: billing.fee,
      currency: billing.currency,
      paymentStatus: 'Pending',
      slotReleased,
      feeRecorded,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { recordExit };