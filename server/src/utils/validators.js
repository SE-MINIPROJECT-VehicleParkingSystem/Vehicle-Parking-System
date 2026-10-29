function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}
function isValidEmail(value) {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
function isStrongEnoughPassword(value) {
  return typeof value === 'string' && value.length >= 8 && value.length <= 128;
}
// Number plates: spaces and hyphens removed, upper case. Non-strings become ''.
function normalizePlate(value) {
  return typeof value === 'string' ? value.replace(/[\s-]/g, '').toUpperCase() : '';
}
function isValidPlate(value) {
  return typeof value === 'string' && /^[A-Z0-9]{4,15}$/.test(value);
}
module.exports = {
  normalizeEmail,
  isValidEmail,
  isStrongEnoughPassword,
  normalizePlate,
  isValidPlate,
};