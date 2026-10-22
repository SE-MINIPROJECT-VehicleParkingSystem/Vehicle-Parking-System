function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}
function isValidEmail(value) {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
function isStrongEnoughPassword(value) {
  return typeof value === 'string' && value.length >= 8 && value.length <= 128;
}
module.exports = { normalizeEmail, isValidEmail, isStrongEnoughPassword };
