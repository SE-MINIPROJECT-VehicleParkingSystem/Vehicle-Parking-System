import assert from "node:assert/strict";
import test from "node:test";
import request from "supertest";
import { signAccessToken } from "../src/auth.js";
import { createApp } from "../src/server.js";

const jwtSecret = "parking-route-test-secret-at-least-32-bytes";

function makeParkingApp() {
  const slots = [{ slotNumber: "A-01", vehicleType: "Car", status: "Available", activeTicket: null }];
  const sessions = [];
  const ParkingSlot = {
    find: () => ({ sort: async () => slots }),
    findOneAndUpdate: async (filter, update) => {
      const slot = slots.find((item) => Object.entries(filter).every(([key, value]) => item[key] === value));
      if (!slot) return null;
      Object.assign(slot, update.$set);
      return { ...slot };
    },
    aggregate: async () => []
  };
  const ParkingSession = {
    exists: (filter) => Promise.resolve(sessions.some((item) => item.plateNumber === filter.plateNumber && item.active === filter.active)),
    create: async (documents) => { sessions.push(...documents); return documents; },
    findOneAndUpdate: async (filter, update) => {
      const record = sessions.find((item) => Object.entries(filter).every(([key, value]) => item[key] === value));
      if (!record) return null;
      Object.assign(record, update.$set);
      return { ...record };
    },
    aggregate: async () => []
  };
  const app = createApp({
    jwtSecret,
    ParkingSlot,
    ParkingSession,
    ParkingTransaction: { aggregate: async () => [] },
    PricingRule: { find: () => ({ sort: async () => [] }) },
    runTransaction: (operation) => operation({ testTransaction: true })
  });
  const tokenFor = (role) => `Bearer ${signAccessToken({ _id: `${role.toLowerCase()}-1`, role }, jwtSecret)}`;

  return { app, slots, sessions, tokenFor };
}

test("only Gate Staff and Administrators can use parking entry and exit routes", async () => {
  const { app, tokenFor } = makeParkingApp();
  await request(app).post("/api/staff/entries").send({ plateNumber: "AB123", vehicleType: "Car" }).expect(401);
  await request(app)
    .post("/api/staff/entries")
    .set("Authorization", tokenFor("Owner"))
    .send({ plateNumber: "AB123", vehicleType: "Car" })
    .expect(403);
});

test("Gate Staff can enter and exit a vehicle with its assigned slot", async () => {
  const { app, slots, sessions, tokenFor } = makeParkingApp();
  const authorization = tokenFor("Gate Staff");
  const entry = await request(app)
    .post("/api/staff/entries")
    .set("Authorization", authorization)
    .send({ plateNumber: "ab-123", vehicleType: "Car" })
    .expect(201);

  assert.equal(entry.body.slotNumber, "A-01");
  assert.equal(sessions[0].ticketNumber, entry.body.ticketNumber);
  assert.equal(slots[0].activeTicket, entry.body.ticketNumber);
  assert.equal(slots[0].status, "Occupied");

  await request(app)
    .post("/api/staff/exits")
    .set("Authorization", authorization)
    .send({ ticketNumber: entry.body.ticketNumber })
    .expect(200);
  assert.equal(sessions[0].active, false);
  assert.equal(slots[0].status, "Available");
  assert.equal(slots[0].activeTicket, null);
});

test("entry with no matching available slot returns a clear conflict", async () => {
  const { app, tokenFor } = makeParkingApp();
  const response = await request(app)
    .post("/api/staff/entries")
    .set("Authorization", tokenFor("Administrator"))
    .send({ plateNumber: "AB123", vehicleType: "Motorcycle" })
    .expect(409);
  assert.deepEqual(response.body, { error: "No available slot matches this vehicle type" });
});