// Parking pricing rules: rupees per started hour, by vehicle type.
// Defaults can be overridden with RATE_TWO_WHEELER, RATE_FOUR_WHEELER and RATE_OTHER
// in server/.env. Values must be whole, non-negative rupee amounts.
const DEFAULT_RATES = {
  'Two-wheeler': 10,
  'Four-wheeler': 20,
  Other: 30,
};

const ENV_NAMES = {
  'Two-wheeler': 'RATE_TWO_WHEELER',
  'Four-wheeler': 'RATE_FOUR_WHEELER',
  Other: 'RATE_OTHER',
};

function readRate(vehicleType) {
  const raw = process.env[ENV_NAMES[vehicleType]];
  if (raw === undefined || raw === '') return DEFAULT_RATES[vehicleType];

  const value = Number(raw);
  if (Number.isInteger(value) && value >= 0) return value;

  console.warn(
    `Ignoring invalid ${ENV_NAMES[vehicleType]}="${raw}"; using default of ${DEFAULT_RATES[vehicleType]}.`
  );
  return DEFAULT_RATES[vehicleType];
}

// Returns the hourly rate for a vehicle type, or null if there is no pricing rule for it.
function getRatePerHour(vehicleType) {
  if (!Object.prototype.hasOwnProperty.call(DEFAULT_RATES, vehicleType)) return null;
  return readRate(vehicleType);
}

module.exports = { DEFAULT_RATES, getRatePerHour };