const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  slotId: {
    type: String,
    required: true,
    trim: true
  },
  vehicleNumberPlate: {
    type: String,
    required: true,
    trim: true,
    uppercase: true,
    maxlength: 15
  },
  vehicleType: {
    type: String,
    enum: ['Two-wheeler', 'Four-wheeler', 'Other'],
    required: true
  },
  status: {
    type: String,
    enum: ['Booked', 'Cancelled'],
    default: 'Booked'
  },
  bookingTime: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

schema.index(
  { slotId: 1 },
  { unique: true, partialFilterExpression: { status: 'Booked' } }
);

schema.index(
  { ownerId: 1, vehicleNumberPlate: 1 },
  { unique: true, partialFilterExpression: { status: 'Booked' } }
);

module.exports = mongoose.model('Booking', schema);