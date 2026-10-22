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
  create: jest.fn(),
}));

const User = require('../src/models/User');
const ParkingSlot = require('../src/models/ParkingSlot');
const ParkingTransaction = require('../src/models/ParkingTransaction');
const app = require('../src/app');

function cookieFor(role) {
  const token = jwt.sign({ role }, process.env.JWT_SECRET, { subject: 'user1' });
  return `parking_token=${token}`;
}

function loginAs(role) {
  User.findById.mockResolvedValue({ _id: 'user1', role, isActive: true });
  return cookieFor(role);
}

function duplicateKeyError(field) {
  return Object.assign(new Error('E11000 duplicate key'), {
    code: 11000,
    keyPattern: { [field]: 1 },
  });
}

const validBody = { numberPlate: 'ka01 ab-1234', vehicleType: 'Four-wheeler' };

describe('POST /api/entries', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    ParkingTransaction.findOne.mockReturnValue({ lean: () => Promise.resolve(null) });
  });

  test('rejects requests with no login (401)', async () => {
    const res = await request(app).post('/api/entries').send(validBody);
    expect(res.status).toBe(401);
  });

  test('rejects Owner accounts (403)', async () => {
    const cookie = loginAs('Owner');
    const res = await request(app).post('/api/entries').set('Cookie', cookie).send(validBody);
    expect(res.status).toBe(403);
  });

  test('rejects an invalid number plate (400)', async () => {
    const cookie = loginAs('Staff');
    const res = await request(app)
      .post('/api/entries')
      .set('Cookie', cookie)
      .send({ numberPlate: 'A', vehicleType: 'Four-wheeler' });
    expect(res.status).toBe(400);
  });

  test('rejects an invalid vehicle type (400)', async () => {
    const cookie = loginAs('Staff');
    const res = await request(app)
      .post('/api/entries')
      .set('Cookie', cookie)
      .send({ numberPlate: 'KA01AB1234', vehicleType: 'Spaceship' });
    expect(res.status).toBe(400);
  });

  test('blocks a duplicate active session (409)', async () => {
    const cookie = loginAs('Staff');
    ParkingTransaction.findOne.mockReturnValue({
      lean: () => Promise.resolve({ vehicleNumberPlate: 'KA01AB1234' }),
    });
    const res = await request(app).post('/api/entries').set('Cookie', cookie).send(validBody);
    expect(res.status).toBe(409);
    expect(ParkingTransaction.create).not.toHaveBeenCalled();
  });

  test('returns 409 when no slot is available', async () => {
    const cookie = loginAs('Staff');
    ParkingSlot.findOneAndUpdate.mockResolvedValue(null);
    const res = await request(app).post('/api/entries').set('Cookie', cookie).send(validBody);
    expect(res.status).toBe(409);
    expect(ParkingTransaction.create).not.toHaveBeenCalled();
  });

  test('records a valid entry (201) with a saved entry time', async () => {
    const cookie = loginAs('Staff');
    ParkingSlot.findOneAndUpdate.mockResolvedValue({ _id: 's1', slotId: 'A-01' });
    ParkingTransaction.create.mockImplementation(async (doc) => doc);

    const res = await request(app).post('/api/entries').set('Cookie', cookie).send(validBody);

    expect(res.status).toBe(201);
    expect(res.body.data.numberPlate).toBe('KA01AB1234');
    expect(res.body.data.slotId).toBe('A-01');
    expect(res.body.data.entryTime).toBeDefined();
    expect(ParkingTransaction.create).toHaveBeenCalledTimes(1);
  });

  test('releases the slot if saving the session fails', async () => {
    const cookie = loginAs('Staff');
    ParkingSlot.findOneAndUpdate.mockResolvedValue({ _id: 's1', slotId: 'A-01' });
    ParkingTransaction.create.mockRejectedValue(new Error('db down'));
    jest.spyOn(console, 'error').mockImplementation(() => {});

    const res = await request(app).post('/api/entries').set('Cookie', cookie).send(validBody);

    expect(res.status).toBe(500);
    expect(ParkingSlot.updateOne).toHaveBeenCalledWith({ _id: 's1' }, { status: 'Available' });
  });

  // ---- New tests for the reviewer's three issues ----

  test('still returns 500 and logs loudly if releasing the slot also fails', async () => {
    const cookie = loginAs('Staff');
    ParkingSlot.findOneAndUpdate.mockResolvedValue({ _id: 's1', slotId: 'A-01' });
    ParkingTransaction.create.mockRejectedValue(new Error('db down'));
    ParkingSlot.updateOne.mockRejectedValue(new Error('release failed'));
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const res = await request(app).post('/api/entries').set('Cookie', cookie).send(validBody);

    expect(res.status).toBe(500);
    expect(ParkingSlot.updateOne).toHaveBeenCalledWith({ _id: 's1' }, { status: 'Available' });
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('A-01'), expect.any(Error));
  });

  test('returns 409 and frees the slot when the database rejects a duplicate active session', async () => {
    const cookie = loginAs('Staff');
    ParkingSlot.findOneAndUpdate.mockResolvedValue({ _id: 's1', slotId: 'A-01' });
    ParkingTransaction.create.mockRejectedValue(duplicateKeyError('vehicleNumberPlate'));

    const res = await request(app).post('/api/entries').set('Cookie', cookie).send(validBody);

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/active parking session/i);
    expect(ParkingSlot.updateOne).toHaveBeenCalledWith({ _id: 's1' }, { status: 'Available' });
  });

  test('retries with new IDs when an ID collides, without releasing the slot', async () => {
    const cookie = loginAs('Staff');
    ParkingSlot.findOneAndUpdate.mockResolvedValue({ _id: 's1', slotId: 'A-01' });
    ParkingTransaction.create
      .mockRejectedValueOnce(duplicateKeyError('entryTicketNumber'))
      .mockImplementation(async (doc) => doc);

    const res = await request(app).post('/api/entries').set('Cookie', cookie).send(validBody);

    expect(res.status).toBe(201);
    expect(ParkingTransaction.create).toHaveBeenCalledTimes(2);
    expect(ParkingSlot.updateOne).not.toHaveBeenCalled();
  });

  test('generates long random IDs that fit the schema limits', async () => {
    const cookie = loginAs('Staff');
    ParkingSlot.findOneAndUpdate.mockResolvedValue({ _id: 's1', slotId: 'A-01' });
    ParkingTransaction.create.mockImplementation(async (doc) => doc);

    await request(app).post('/api/entries').set('Cookie', cookie).send(validBody);

    const doc = ParkingTransaction.create.mock.calls[0][0];
    expect(doc.transactionId).toMatch(/^TXN-[0-9A-F]{16}$/);
    expect(doc.entryTicketNumber).toMatch(/^TKT-\d{6}-[0-9A-F]{8}$/);
  });
});