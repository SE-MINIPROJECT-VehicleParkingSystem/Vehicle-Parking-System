process.env.JWT_SECRET = 'test-secret-that-is-at-least-32-characters-long';

const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../src/models/User', () => ({ findById: jest.fn() }));
jest.mock('../src/models/ParkingSlot', () => ({ find: jest.fn() }));

const User = require('../src/models/User');
const ParkingSlot = require('../src/models/ParkingSlot');
const app = require('../src/app');

function loginAs(role) {
  User.findById.mockResolvedValue({ _id: 'user1', role, isActive: true });
  const token = jwt.sign({ role }, process.env.JWT_SECRET, { subject: 'user1' });
  return `parking_token=${token}`;
}

// Mimics find().select().sort().lean()
function mockFind(result) {
  const chain = {
    select: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    lean: jest.fn(),
  };
  if (result instanceof Error) chain.lean.mockRejectedValue(result);
  else chain.lean.mockResolvedValue(result);
  ParkingSlot.find.mockReturnValue(chain);
  return chain;
}

const sampleSlots = [
  { slotId: 'A001', zone: 'A', slotNumber: '1', vehicleType: 'Two-wheeler', status: 'Available' },
  { slotId: 'A002', zone: 'A', slotNumber: '2', vehicleType: 'Four-wheeler', status: 'Occupied' },
  { slotId: 'A003', zone: 'A', slotNumber: '3', vehicleType: 'Other', status: 'Reserved' },
  { slotId: 'A004', zone: 'A', slotNumber: '4', vehicleType: 'Two-wheeler', status: 'Available' },
];

describe('GET /api/slots', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('rejects requests with no login (401)', async () => {
    const res = await request(app).get('/api/slots');
    expect(res.status).toBe(401);
    expect(ParkingSlot.find).not.toHaveBeenCalled();
  });

  test.each(['Owner', 'Staff', 'Admin'])('allows %s accounts (200)', async (role) => {
    const cookie = loginAs(role);
    mockFind(sampleSlots);
    const res = await request(app).get('/api/slots').set('Cookie', cookie);
    expect(res.status).toBe(200);
  });

  test('returns available and occupied slots matching the stored records', async () => {
    const cookie = loginAs('Owner');
    mockFind(sampleSlots);

    const res = await request(app).get('/api/slots').set('Cookie', cookie);

    expect(res.body.data.slots).toEqual(sampleSlots);
    expect(res.body.data.summary).toEqual({ total: 4, available: 2, occupied: 1, reserved: 1 });
    expect(res.body.data.updatedAt).toBeDefined();
  });

  test('summary counts add up to the total', async () => {
    const cookie = loginAs('Owner');
    mockFind(sampleSlots);
    const { summary } = (await request(app).get('/api/slots').set('Cookie', cookie)).body.data;
    expect(summary.available + summary.occupied + summary.reserved).toBe(summary.total);
  });

  test('applies zone, vehicle type and status filters', async () => {
    const cookie = loginAs('Staff');
    mockFind([]);

    await request(app)
      .get('/api/slots?zone=a&vehicleType=Two-wheeler&status=Available')
      .set('Cookie', cookie);

    expect(ParkingSlot.find).toHaveBeenCalledWith({
      zone: 'A',
      vehicleType: 'Two-wheeler',
      status: 'Available',
    });
  });

  test('rejects an invalid vehicle type (400)', async () => {
    const cookie = loginAs('Owner');
    const res = await request(app).get('/api/slots?vehicleType=Spaceship').set('Cookie', cookie);
    expect(res.status).toBe(400);
    expect(ParkingSlot.find).not.toHaveBeenCalled();
  });

  test('rejects an invalid status (400)', async () => {
    const cookie = loginAs('Owner');
    const res = await request(app).get('/api/slots?status=Broken').set('Cookie', cookie);
    expect(res.status).toBe(400);
  });

  test('rejects an invalid zone (400)', async () => {
    const cookie = loginAs('Owner');
    const res = await request(app).get('/api/slots?zone=A%20B!').set('Cookie', cookie);
    expect(res.status).toBe(400);
  });

  test('rejects query operator objects (400)', async () => {
    const cookie = loginAs('Owner');
    const res = await request(app).get('/api/slots?status[$ne]=Available').set('Cookie', cookie);
    expect(res.status).toBe(400);
    expect(ParkingSlot.find).not.toHaveBeenCalled();
  });

  test('returns an empty list with a clear message when no slots exist', async () => {
    const cookie = loginAs('Owner');
    mockFind([]);
    const res = await request(app).get('/api/slots').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.data.slots).toEqual([]);
    expect(res.body.data.summary.total).toBe(0);
    expect(res.body.message).toMatch(/no parking slots/i);
  });

  test('returns 503 with an appropriate message when data is unavailable', async () => {
    const cookie = loginAs('Owner');
    mockFind(new Error('db down'));
    jest.spyOn(console, 'error').mockImplementation(() => {});

    const res = await request(app).get('/api/slots').set('Cookie', cookie);

    expect(res.status).toBe(503);
    expect(res.body.message).toMatch(/currently unavailable/i);
    expect(res.body.data).toBeNull();
  });
});