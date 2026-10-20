const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  transactionId: { type: String, required: true, unique: true, trim: true, maxlength: 24 },
  vehicleNumberPlate: { type: String, required: true, trim: true, uppercase: true, maxlength: 15 },
  vehicleType: { type: String, enum: ['Two-wheeler', 'Four-wheeler', 'Other'], required: true, maxlength: 20 },
  slotId: { type: String, required: true, trim: true, maxlength: 10 },
  entryTicketNumber: { type: String, required: true, unique: true, trim: true, maxlength: 20 },
  entryTime: { type: Date, required: true, default: Date.now },
  exitTime: { type: Date, default: null },
  fee: { type: Number, min: 0, default: null },
  paymentStatus: { type: String, enum: ['Paid', 'Pending'], default: 'Pending', maxlength: 10 },
  paymentMethod: { type: String, enum: ['Cash', 'Online', null], default: null, maxlength: 10 }
}, { timestamps: true });

module.exports = mongoose.model('ParkingTransaction', schema);
