import assert from "node:assert/strict";
import test from "node:test";
import jwt from "jsonwebtoken";
import request from "supertest";
import { createApp } from "../src/server.js";

const jwtSecret = "unit-test-secret";

function makeTestApp() {
  const updates = { slots: [], pricing: [] };
  const slots = [{ slotNumber: "A-01", zone: "North", vehicleType: "Car", status: "Available" }];
  const pricing = [{ vehicleType: "Car", hourlyRate: 2 }];
  const makeModel = (collection, updateLog) => ({
    find: () => ({ sort: async () => collection }),
    findOneAndUpdate: async (filter, update) => {
      updateLog.push({ filter, update });
      return { ...filter, ...update.$set };
    }
  });
  const app = createApp({
    jwtSecret,
    ParkingSlot: makeModel(slots, updates.slots),
    PricingRule: makeModel(pricing, updates.pricing)
  });

  return { app, updates };
}

function tokenFor(role) {
  return jwt.sign({ role }, jwtSecret);
}

test("admin settings endpoints require an authenticated administrator", async () => {
  const { app } = makeTestApp();
  await request(app).get("/api/admin/slots").expect(401);
  await request(app).get("/api/admin/slots").set("Authorization", `Bearer ${tokenFor("Owner")}`).expect(403);
  await request(app).get("/api/admin/slots").set("Authorization", "Bearer invalid").expect(401);
});

test("administrator can list and update a parking slot", async () => {
  const { app, updates } = makeTestApp();
  const authorization = `Bearer ${tokenFor("Administrator")}`;

  const list = await request(app).get("/api/admin/slots").set("Authorization", authorization).expect(200);
  assert.equal(list.body[0].slotNumber, "A-01");

  const update = await request(app)
    .put("/api/admin/slots/A-02")
    .set("Authorization", authorization)
    .send({ zone: "South", vehicleType: "Motorcycle" })
    .expect(200);
  assert.deepEqual(update.body, {
    slotNumber: "A-02",
    zone: "South",
    vehicleType: "Motorcycle",
    status: "Available"
  });
  assert.equal(updates.slots.length, 1);
});

test("invalid slot and pricing settings are rejected without writes", async () => {
  const { app, updates } = makeTestApp();
  const authorization = `Bearer ${tokenFor("Administrator")}`;

  await request(app)
    .put("/api/admin/slots/A-02")
    .set("Authorization", authorization)
    .send({ zone: "South", vehicleType: "Motorcycle", status: "Broken" })
    .expect(400);
  await request(app)
    .put("/api/admin/pricing/Car")
    .set("Authorization", authorization)
    .send({ hourlyRate: -1 })
    .expect(400);

  assert.equal(updates.slots.length, 0);
  assert.equal(updates.pricing.length, 0);
});

test("administrator can update a pricing rule without touching parking records", async () => {
  const { app, updates } = makeTestApp();
  const response = await request(app)
    .put("/api/admin/pricing/Car")
    .set("Authorization", `Bearer ${tokenFor("Administrator")}`)
    .send({ hourlyRate: 3.5 })
    .expect(200);

  assert.deepEqual(response.body, { vehicleType: "Car", hourlyRate: 3.5 });
  assert.equal(updates.pricing.length, 1);
  assert.equal(updates.slots.length, 0);
});