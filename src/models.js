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

export const ParkingSlot = mongoose.models.ParkingSlot || mongoose.model("ParkingSlot", parkingSlotSchema);
export const PricingRule = mongoose.models.PricingRule || mongoose.model("PricingRule", pricingRuleSchema);