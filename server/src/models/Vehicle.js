const mongoose = require('mongoose');

const VEHICLE_TYPES = ['Two-wheeler', 'Four-wheeler', 'Other'];
const schema = new mongoose.Schema({
  vehicleId: { type: String, required: true, unique: true, trim: true, maxlength: 24 },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  numberPlate: { type: String, required: true, trim: true, uppercase: true, maxlength: 15 },
  vehicleType: { type: String, enum: VEHICLE_TYPES, required: true, maxlength: 20 }
}, { timestamps: true });
schema.index({ numberPlate: 1 }, { unique: true });
module.exports = mongoose.model('Vehicle', schema);
module.exports.VEHICLE_TYPES = VEHICLE_TYPES;
