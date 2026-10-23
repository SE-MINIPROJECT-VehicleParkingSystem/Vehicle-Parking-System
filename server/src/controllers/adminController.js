
const ParkingSlot = require('../models/ParkingSlot');
const ParkingTransaction = require('../models/ParkingTransaction');
const { sendSuccess } = require('../utils/apiResponse');

async function getDashboard(req, res, next) {
  try {
    // Count slots by their saved status.
    const [
      totalSlots,
      availableSlots,
      occupiedSlots,
      reservedSlots,
      activeSessions,
      completedSessions,
      recentTransactions,
      slots,
    ] = await Promise.all([
      ParkingSlot.countDocuments(),
      ParkingSlot.countDocuments({ status: 'Available' }),
      ParkingSlot.countDocuments({ status: 'Occupied' }),
      ParkingSlot.countDocuments({ status: 'Reserved' }),

      // Vehicles that have entered but have not exited yet.
      ParkingTransaction.countDocuments({ exitTime: null }),

      // Sessions that have an exit time.
      ParkingTransaction.countDocuments({
        exitTime: { $ne: null },
      }),

      // Latest 10 parking transactions.
      ParkingTransaction.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .select(
          'transactionId entryTicketNumber vehicleNumberPlate vehicleType slotId entryTime exitTime fee paymentStatus paymentMethod'
        )
        .lean(),

      // Current slot information.
      ParkingSlot.find()
        .sort({ zone: 1, slotNumber: 1 })
        .select('slotId zone slotNumber status vehicleType')
        .lean(),
    ]);

    const occupancyRate =
      totalSlots === 0
        ? 0
        : Number(((occupiedSlots / totalSlots) * 100).toFixed(2));

    return sendSuccess(res, 'Admin dashboard data retrieved.', {
      summary: {
        totalSlots,
        availableSlots,
        occupiedSlots,
        reservedSlots,
        activeSessions,
        completedSessions,
        occupancyRate,
      },
      slots,
      recentTransactions,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { getDashboard };
