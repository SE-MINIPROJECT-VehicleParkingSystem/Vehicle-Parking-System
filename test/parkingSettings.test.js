import assert from "node:assert/strict";
import test from "node:test";
import { validatePricingInput, validateSlotInput } from "../src/parkingSettings.js";

test("slot settings require a slot number, zone, and vehicle type", () => {
  assert.deepEqual(validateSlotInput({
    slotNumber: "A-01",
    zone: "North",
    vehicleType: "Car"
  }), {
    slotNumber: "A-01",
    zone: "North",
    vehicleType: "Car",
    status: "Available"
  });
  assert.throws(() => validateSlotInput({ slotNumber: "A-01", zone: "North" }), /Vehicle type is required/);
});

test("slot settings reject unsupported statuses", () => {
  assert.throws(() => validateSlotInput({
    slotNumber: "A-01",
    zone: "North",
    vehicleType: "Car",
    status: "Unknown"
  }), /Status must be Available, Occupied, or Reserved/);
});

test("slot settings enforce field length limits", () => {
  assert.throws(() => validateSlotInput({
    slotNumber: "A".repeat(25),
    zone: "North",
    vehicleType: "Car"
  }), /Slot number must be 24 characters or fewer/);
  assert.throws(() => validatePricingInput({
    vehicleType: "C".repeat(31),
    hourlyRate: 2
  }), /Vehicle type must be 30 characters or fewer/);
});

test("pricing requires a vehicle type and a finite non-negative rate", () => {
  assert.deepEqual(validatePricingInput({ vehicleType: "Car", hourlyRate: 2.5 }), {
    vehicleType: "Car",
    hourlyRate: 2.5
  });
  for (const hourlyRate of [-1, Number.NaN, Number.POSITIVE_INFINITY, "2.5"]) {
    assert.throws(() => validatePricingInput({ vehicleType: "Car", hourlyRate }), /Hourly rate/);
  }
});