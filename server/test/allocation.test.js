jest.mock('../src/models/ParkingSlot', () => ({
  findOneAndUpdate: jest.fn(),
}));

const ParkingSlot = require('../src/models/ParkingSlot');
const { allocateSlot, ALLOCATION_ORDER } = require('../src/services/slotAllocator');

describe('allocateSlot', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('claims an Available slot of the requested type and marks it Occupied in one update', async () => {
    ParkingSlot.findOneAndUpdate.mockResolvedValue({ slotId: 'A002', status: 'Occupied' });

    const slot = await allocateSlot('Four-wheeler');

    expect(slot.slotId).toBe('A002');
    expect(ParkingSlot.findOneAndUpdate).toHaveBeenCalledTimes(1);
    const [filter, update, options] = ParkingSlot.findOneAndUpdate.mock.calls[0];
    expect(filter).toEqual({ status: 'Available', vehicleType: 'Four-wheeler' });
    expect(update).toEqual({ status: 'Occupied' });
    expect(options.new).toBe(true);
  });

  test('never matches Occupied or Reserved slots', async () => {
    ParkingSlot.findOneAndUpdate.mockResolvedValue(null);

    await allocateSlot('Two-wheeler');

    const [filter] = ParkingSlot.findOneAndUpdate.mock.calls[0];
    expect(filter.status).toBe('Available');
  });

  test('picks the nearest slot: lowest zone, then lowest slotId', async () => {
    ParkingSlot.findOneAndUpdate.mockResolvedValue(null);

    await allocateSlot('Other');

    const [, , options] = ParkingSlot.findOneAndUpdate.mock.calls[0];
    expect(options.sort).toEqual({ zone: 1, slotId: 1 });
    expect(ALLOCATION_ORDER).toEqual({ zone: 1, slotId: 1 });
  });

  test('zero-padded slot ids sort in natural order (A010 comes after A002)', () => {
    const ids = ['A010', 'A002', 'A001', 'A009'];
    expect([...ids].sort()).toEqual(['A001', 'A002', 'A009', 'A010']);
    // The old sort key, an unpadded string, got this wrong:
    expect(['1', '10', '2'].sort()).toEqual(['1', '10', '2']);
  });

  test('returns null when no suitable slot is free', async () => {
    ParkingSlot.findOneAndUpdate.mockResolvedValue(null);
    expect(await allocateSlot('Four-wheeler')).toBeNull();
  });

  test('passes database errors to the caller', async () => {
    ParkingSlot.findOneAndUpdate.mockRejectedValue(new Error('db down'));
    await expect(allocateSlot('Four-wheeler')).rejects.toThrow('db down');
  });
});