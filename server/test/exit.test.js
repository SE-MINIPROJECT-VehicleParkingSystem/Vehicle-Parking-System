process.env.JWT_SECRET = 'test-secret-that-is-at-least-32-characters-long';

const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../src/models/User', () => ({ findById: jest.fn() }));
jest.mock('../src/models/ParkingSlot', () => ({
  findOneAndUpdate: jest.fn(),
  updateOne: jest.fn(),
}));
jest.mock('../src/models/ParkingTransaction', () => ({
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
  create: jest.fn(),
}));

const User = require('../src/models/User');
const ParkingSlot = require('../src/models/ParkingSlot');
const ParkingTransaction = require('../src/models/ParkingTransaction');
const app = require('../src/app');

function loginAs(role) {
  User.findById.mockResolvedValue({ _id: 'user1', role, isActive: true });
  const token = jwt.sign({ role }, process.env.JWT_SECRET, { subject: 'user1' });
  return `parking_token=${token}`;
}

// findOne(...).sort(...).lean() used to look for an already-closed session
function mockClosedLookup(result) {
  ParkingTransaction.findOne.mockReturnValue({
    sort: () => ({ lean: () => Promise.resolve(result) }),
  });
}

const entryTime = new Date('2026-01-01T10:00:00.000Z');
const exitTime = new Date('2026-01-01T11:30:00.000Z');
const closedSession = {
  transactionId: 'TXN-0123456789ABCDEF',
  entryTicketNumber: 'TKT-260101-ABCD1234',
  vehicleNumberPlate: 'KA01AB1234',
  vehicleType: 'Four-wheeler',
  slotId: 'A001',
  entryTime,
  exitTime,
};
const body = { numberPlate: 'ka01 ab-1234' };

describe('POST /api/exits', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    ParkingSlot.updateOne.mockResolvedValue({ modifiedCount: 1 });
    mockClosedLookup(null);
  });

  test('rejects requests with no login (401)', async () => {
    const res = await request(app).post('/api/exits').send(body);
    expect(res.status).toBe(401);
  });

  test('rejects Owner accounts (403)', async () => {
    const cookie = loginAs('Owner');
    const res = await request(app).post('/api/exits').set('Cookie', cookie).send(body);
    expect(res.status).toBe(403);
    expect(ParkingTransaction.findOneAndUpdate).not.toHaveBeenCalled();
  });

  test('rejects an invalid number plate (400)', async () => {
    const cookie = loginAs('Staff');
    const res = await request(app).post('/api/exits').set('Cookie', cookie).send({ numberPlate: 'A' });
    expect(res.status).toBe(400);
    expect(ParkingTransaction.findOneAndUpdate).not.toHaveBeenCalled();
  });

  test('rejects a missing number plate and operator objects (400)', async () => {
    const cookie = loginAs('Staff');
    const missing = await request(app).post('/api/exits').set('Cookie', cookie).send({});
    const injected = await request(app)
      .post('/api/exits')
      .set('Cookie', cookie)
      .send({ numberPlate: { $ne: '' } });
    expect(missing.status).toBe(400);
    expect(injected.status).toBe(400);
    expect(ParkingTransaction.findOneAndUpdate).not.toHaveBeenCalled();
  });

  test('closes the active session, records the exit time and frees the slot (200)', async () => {
    const cookie = loginAs('Staff');
    ParkingTransaction.findOneAndUpdate.mockResolvedValue(closedSession);

    const res = await request(app).post('/api/exits').set('Cookie', cookie).send(body);

    expect(res.status).toBe(200);
    expect(res.body.data.numberPlate).toBe('KA01AB1234');
    expect(res.body.data.slotId).toBe('A001');
    expect(res.body.data.exitTime).toBeDefined();
    expect(res.body.data.durationMinutes).toBe(90);
    expect(res.body.data.slotReleased).toBe(true);

    // Looks up only ACTIVE sessions (no exit time) and sets the exit time in the same step
    const [filter, update, options] = ParkingTransaction.findOneAndUpdate.mock.calls[0];
    expect(filter).toEqual({ vehicleNumberPlate: 'KA01AB1234', exitTime: null });
    expect(update.exitTime).toBeInstanceOf(Date);
    expect(options).toEqual({ new: true });

    expect(ParkingSlot.updateOne).toHaveBeenCalledWith(
      { slotId: 'A001', status: 'Occupied' },
      { status: 'Available' }
    );
  });

  test('allows Admin accounts too', async () => {
    const cookie = loginAs('Admin');
    ParkingTransaction.findOneAndUpdate.mockResolvedValue(closedSession);
    const res = await request(app).post('/api/exits').set('Cookie', cookie).send(body);
    expect(res.status).toBe(200);
  });

  test('a closed session cannot be exited again (409) and no slot is touched', async () => {
    const cookie = loginAs('Staff');
    ParkingTransaction.findOneAndUpdate.mockResolvedValue(null);
    mockClosedLookup(closedSession);

    const res = await request(app).post('/api/exits').set('Cookie', cookie).send(body);

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/already closed/i);
    expect(ParkingSlot.updateOne).not.toHaveBeenCalled();
  });

  test('returns 404 when the vehicle has no active session', async () => {
    const cookie = loginAs('Staff');
    ParkingTransaction.findOneAndUpdate.mockResolvedValue(null);

    const res = await request(app).post('/api/exits').set('Cookie', cookie).send(body);

    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/no active parking session/i);
    expect(ParkingSlot.updateOne).not.toHaveBeenCalled();
  });

  test('still reports the exit, and logs loudly, if the slot cannot be released', async () => {
    const cookie = loginAs('Staff');
    ParkingTransaction.findOneAndUpdate.mockResolvedValue(closedSession);
    ParkingSlot.updateOne.mockRejectedValue(new Error('release failed'));
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const res = await request(app).post('/api/exits').set('Cookie', cookie).send(body);

    expect(res.status).toBe(200);
    expect(res.body.data.slotReleased).toBe(false);
    expect(res.body.message).toMatch(/A001/);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('A001'), expect.any(Error));
  });

  test('returns 500 if the database fails while closing the session', async () => {
    const cookie = loginAs('Staff');
    ParkingTransaction.findOneAndUpdate.mockRejectedValue(new Error('db down'));
    jest.spyOn(console, 'error').mockImplementation(() => {});

    const res = await request(app).post('/api/exits').set('Cookie', cookie).send(body);

    expect(res.status).toBe(500);
    expect(ParkingSlot.updateOne).not.toHaveBeenCalled();
  });
});