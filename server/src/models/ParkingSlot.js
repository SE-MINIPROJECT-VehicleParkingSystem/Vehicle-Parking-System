const mongoose = require('mongoose');

const VEHICLE_TYPES = ['Two-wheeler', 'Four-wheeler', 'Other'];
const schema = new mongoose.Schema({
  slotId: { type: String, required: true, unique: true, trim: true, maxlength: 10 },
  zone: { type: String, required: true, trim: true, uppercase: true, maxlength: 10 },
  slotNumber: { type: String, required: true, trim: true, maxlength: 10 },
  status: { type: String, enum: ['Available', 'Occupied', 'Reserved'], required: true, default: 'Available', maxlength: 10 },
  vehicleType: { type: String, enum: VEHICLE_TYPES, required: true, maxlength: 20 }
}, { timestamps: true });
schema.index({ zone: 1, slotNumber: 1 }, { unique: true });
module.exports = mongoose.model('ParkingSlot', schema);
