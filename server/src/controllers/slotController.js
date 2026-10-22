const ParkingSlot = require('../models/ParkingSlot');
const { VEHICLE_TYPES } = require('../models/Vehicle');
const { sendSuccess, sendError } = require('../utils/apiResponse');

const SLOT_STATUSES = ['Available', 'Occupied', 'Reserved'];

// Query values must be plain strings; this also blocks operator objects such as ?status[$ne]=x.
function readFilter(value) {
  return typeof value === 'string' ? value.trim() : undefined;
}

async function getSlotAvailability(req, res) {
  const zone = readFilter(req.query.zone);
  const vehicleType = readFilter(req.query.vehicleType);
  const status = readFilter(req.query.status);

  const filter = {};

  if (req.query.zone !== undefined) {
    if (!zone || !/^[A-Za-z0-9]{1,10}$/.test(zone)) {
      return sendError(res, 'Zone must be 1 to 10 letters or digits.', 400);
    }
    filter.zone = zone.toUpperCase();
  }
  if (req.query.vehicleType !== undefined) {
    if (!VEHICLE_TYPES.includes(vehicleType)) {
      return sendError(res, `Vehicle type must be one of: ${VEHICLE_TYPES.join(', ')}.`, 400);
    }
    filter.vehicleType = vehicleType;
  }
  if (req.query.status !== undefined) {
    if (!SLOT_STATUSES.includes(status)) {
      return sendError(res, `Status must be one of: ${SLOT_STATUSES.join(', ')}.`, 400);
    }
    filter.status = status;
  }

  try {
    // slotId is zero-padded (A001, A002, ...) so sorting it gives the natural order.
    const slots = await ParkingSlot.find(filter)
      .select('slotId zone slotNumber vehicleType status -_id')
      .sort({ zone: 1, slotId: 1 })
      .lean();

    // Counts come from the same records that are returned, so they always match the list.
    const summary = { total: slots.length, available: 0, occupied: 0, reserved: 0 };
    for (const slot of slots) {
      if (slot.status === 'Available') summary.available += 1;
      else if (slot.status === 'Occupied') summary.occupied += 1;
      else if (slot.status === 'Reserved') summary.reserved += 1;
    }

    const message = slots.length === 0
      ? 'No parking slots match your search.'
      : 'Slot availability retrieved.';

    return sendSuccess(res, message, {
      summary,
      slots,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Could not load slot availability:', error);
    return sendError(
      res,
      'Slot availability is currently unavailable. Please try again shortly.',
      503
    );
  }
}

module.exports = { getSlotAvailability };