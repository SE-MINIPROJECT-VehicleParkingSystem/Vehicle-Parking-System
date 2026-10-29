const { calculateFee } = require('../src/utils/feeCalculator');
const { getRatePerHour } = require('../src/config/pricing');
const { VEHICLE_TYPES } = require('../src/models/Vehicle');

const entry = new Date('2026-01-01T10:00:00.000Z');
const after = (minutes, seconds = 0) => new Date(entry.getTime() + minutes * 60000 + seconds * 1000);

describe('calculateFee', () => {
  afterEach(() => {
    delete process.env.RATE_FOUR_WHEELER;
    delete process.env.RATE_TWO_WHEELER;
    delete process.env.RATE_OTHER;
  });

  test('Four-wheeler parked 2h 15m is billed 3 hours = Rs 60', () => {
    const result = calculateFee(entry, after(135), 'Four-wheeler');
    expect(result).toEqual({
      durationMinutes: 135,
      billedHours: 3,
      ratePerHour: 20,
      fee: 60,
      currency: 'INR',
    });
  });

  test('exactly one hour is billed one hour', () => {
    expect(calculateFee(entry, after(60), 'Four-wheeler').fee).toBe(20);
  });

  test('one minute over an hour starts a new billed hour', () => {
    const result = calculateFee(entry, after(61), 'Four-wheeler');
    expect(result.billedHours).toBe(2);
    expect(result.fee).toBe(40);
  });

  test('a few seconds over a minute rounds the duration up', () => {
    expect(calculateFee(entry, after(59, 1), 'Four-wheeler').durationMinutes).toBe(60);
    expect(calculateFee(entry, after(60, 1), 'Four-wheeler').durationMinutes).toBe(61);
  });

  test('a very short stay is charged the minimum of one hour', () => {
    const result = calculateFee(entry, after(1), 'Four-wheeler');
    expect(result.billedHours).toBe(1);
    expect(result.fee).toBe(20);
  });

  test('zero duration or exit before entry is charged the minimum of one hour', () => {
    expect(calculateFee(entry, entry, 'Four-wheeler').fee).toBe(20);
    expect(calculateFee(entry, after(-30), 'Four-wheeler').fee).toBe(20);
  });

  test('uses the rate for each vehicle type', () => {
    expect(calculateFee(entry, after(120), 'Two-wheeler').fee).toBe(20);
    expect(calculateFee(entry, after(120), 'Four-wheeler').fee).toBe(40);
    expect(calculateFee(entry, after(120), 'Other').fee).toBe(60);
  });

  test('accepts ISO strings as well as Date objects', () => {
    expect(
      calculateFee('2026-01-01T10:00:00.000Z', '2026-01-01T12:15:00.000Z', 'Four-wheeler').fee
    ).toBe(60);
  });

  test('rejects an unknown vehicle type', () => {
    expect(() => calculateFee(entry, after(60), 'Truck')).toThrow(/No pricing rule/);
    expect(() => calculateFee(entry, after(60), 'constructor')).toThrow(/No pricing rule/);
  });

  test('rejects missing or invalid times', () => {
    expect(() => calculateFee(undefined, after(60), 'Four-wheeler')).toThrow(TypeError);
    expect(() => calculateFee(entry, 'not a date', 'Four-wheeler')).toThrow(TypeError);
  });

  test('rates can be changed with environment variables', () => {
    process.env.RATE_FOUR_WHEELER = '25';
    expect(calculateFee(entry, after(135), 'Four-wheeler').fee).toBe(75);
  });

  test('an invalid rate in the environment falls back to the default', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    process.env.RATE_FOUR_WHEELER = 'abc';
    expect(getRatePerHour('Four-wheeler')).toBe(20);
    process.env.RATE_FOUR_WHEELER = '-5';
    expect(getRatePerHour('Four-wheeler')).toBe(20);
    process.env.RATE_FOUR_WHEELER = '12.5';
    expect(getRatePerHour('Four-wheeler')).toBe(20);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  test('every supported vehicle type has a pricing rule', () => {
    VEHICLE_TYPES.forEach((type) => {
      expect(getRatePerHour(type)).toEqual(expect.any(Number));
    });
  });
});