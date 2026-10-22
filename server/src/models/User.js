const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 50 },
  email: {
    type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 100,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  passwordHash: { type: String, required: true, minlength: 60, maxlength: 60, select: false },
  contactNumber: { type: String, required: true, trim: true, maxlength: 15 },
  // Authentication bookkeeping supports the SRS requirement to lock an account after 3 failed attempts.
  failedLoginAttempts: { type: Number, default: 0, min: 0, select: false },
  lockUntil: { type: Date, default: null, select: false },
  role: { type: String, enum: ['Owner', 'Staff', 'Admin'], required: true, default: 'Owner' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('User', schema);
