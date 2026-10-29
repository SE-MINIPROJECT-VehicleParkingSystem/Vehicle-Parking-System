const slotStatuses = new Set(["Available", "Occupied", "Reserved"]);

function requireText(value, field, maxLength) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${field} is required`);
  }

  const text = value.trim();
  if (text.length > maxLength) {
    throw new TypeError(`${field} must be ${maxLength} characters or fewer`);
  }

  return text;
}

export function validateSlotInput(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("Slot settings must be an object");
  }

  const status = input.status ?? "Available";
  if (!slotStatuses.has(status)) {
    throw new TypeError("Status must be Available, Occupied, or Reserved");
  }

  return {
    slotNumber: requireText(input.slotNumber, "Slot number", 24),
    zone: requireText(input.zone, "Zone", 40),
    vehicleType: requireText(input.vehicleType, "Vehicle type", 30),
    status
  };
}

export function validatePricingInput(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("Pricing settings must be an object");
  }

  const hourlyRate = input.hourlyRate;
  if (typeof hourlyRate !== "number" || !Number.isFinite(hourlyRate) || hourlyRate < 0) {
    throw new TypeError("Hourly rate must be a finite non-negative number");
  }

  return {
    vehicleType: requireText(input.vehicleType, "Vehicle type", 30),
    hourlyRate
  };
}