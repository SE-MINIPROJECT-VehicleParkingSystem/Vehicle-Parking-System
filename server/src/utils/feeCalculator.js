const { getRatePerHour } = require('../config/pricing');

const MS_PER_MINUTE = 60000;
const MINUTES_PER_HOUR = 60;

// Pricing rules:
//  - Duration is exit time minus entry time, rounded UP to whole minutes (minimum 1 minute).
//  - Every started hour is billed in full (minimum 1 hour).
//  - Fee = billed hours x hourly rate for the vehicle type.
// Example: Four-wheeler at Rs 20/hour parked 2h 15m -> 3 billed hours -> Rs 60.
function calculateFee(entryTime, exitTime, vehicleType) {
  const entry = new Date(entryTime);
  const exit = new Date(exitTime);
  if (Number.isNaN(entry.getTime()) || Number.isNaN(exit.getTime())) {
    throw new TypeError('A valid entry time and exit time are required.');
  }

  const ratePerHour = getRatePerHour(vehicleType);
  if (ratePerHour === null) {
    throw new RangeError(`No pricing rule for vehicle type: ${vehicleType}`);
  }

  const durationMinutes = Math.max(1, Math.ceil((exit - entry) / MS_PER_MINUTE));
  const billedHours = Math.ceil(durationMinutes / MINUTES_PER_HOUR);

  return {
    durationMinutes,
    billedHours,
    ratePerHour,
    fee: billedHours * ratePerHour,
    currency: 'INR',
  };
}

module.exports = { calculateFee };