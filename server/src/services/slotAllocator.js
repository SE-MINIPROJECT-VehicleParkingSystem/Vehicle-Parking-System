const ParkingSlot = require('../models/ParkingSlot');

// Allocation order: lowest zone first, then lowest slotId.
// slotId is zero-padded (A001, A002, ... A010), so a plain sort gives the natural order.
// Do NOT sort by slotNumber: it is an unpadded string, so "10" would sort before "2".
const ALLOCATION_ORDER = { zone: 1, slotId: 1 };

// Finds the first AVAILABLE slot that fits the vehicle type and marks it Occupied in the
// same atomic database update. Because the status check and the status change happen
// together, two simultaneous entries can never be given the same slot, and Occupied or
// Reserved slots are never allocated. Returns the allocated slot, or null if none is free.
async function allocateSlot(vehicleType) {
  return ParkingSlot.findOneAndUpdate(
    { status: 'Available', vehicleType },
    { status: 'Occupied' },
    { sort: ALLOCATION_ORDER, new: true }
  );
}

module.exports = { allocateSlot, ALLOCATION_ORDER };