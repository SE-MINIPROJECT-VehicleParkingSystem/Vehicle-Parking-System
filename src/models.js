import mongoose from "mongoose";

const parkingSlotSchema = new mongoose.Schema({
  slotNumber: { type: String, required: true, trim: true, unique: true },
  zone: { type: String, required: true, trim: true },
  vehicleType: { type: String, required: true, trim: true },
  status: { type: String, enum: ["Available", "Occupied", "Reserved"], default: "Available" }
}, { timestamps: true });

const pricingRuleSchema = new mongoose.Schema({
  vehicleType: { type: String, required: true, trim: true, unique: true },
  hourlyRate: { type: Number, required: true, min: 0 }
}, { timestamps: true });

const parkingSessionSchema = new mongoose.Schema({
  ticketNumber: { type: String, required: true, unique: true },
  slotNumber: { type: String, required: true },
  vehicleType: { type: String, required: true },
  enteredAt: { type: Date, required: true },
  exitedAt: { type: Date, default: null }
}, { timestamps: true });

const parkingTransactionSchema = new mongoose.Schema({
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: "ParkingSession", required: true },
  amount: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ["Pending", "Paid", "Failed"], required: true },
  paidAt: { type: Date, default: null },
  paymentMethod: { type: String, enum: ["Cash", "Online"], required: true }
}, { timestamps: true });

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, trim: true, lowercase: true, unique: true, maxlength: 254 },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ["Owner", "Gate Staff", "Administrator"], required: true, default: "Owner" }
}, { timestamps: true });

export const ParkingSlot = mongoose.models.ParkingSlot || mongoose.model("ParkingSlot", parkingSlotSchema);
export const PricingRule = mongoose.models.PricingRule || mongoose.model("PricingRule", pricingRuleSchema);
export const ParkingSession = mongoose.models.ParkingSession || mongoose.model("ParkingSession", parkingSessionSchema);
export const ParkingTransaction = mongoose.models.ParkingTransaction || mongoose.model("ParkingTransaction", parkingTransactionSchema);
export const User = mongoose.models.User || mongoose.model("User", userSchema);