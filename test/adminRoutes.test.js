import assert from "node:assert/strict";
import test from "node:test";
import request from "supertest";
import { signAccessToken } from "../src/auth.js";
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
  return signAccessToken({ _id: "test-user", role }, jwtSecret);
}

test("admin settings endpoints require an authenticated administrator", async () => {
  const { app } = makeTestApp();
  await request(app).get("/api/admin/slots").expect(401);
  await request(app).get("/api/admin/slots").set("Authorization", `Bearer ${tokenFor("Owner")}`).expect(403);
  await request(app).get("/api/admin/slots").set("Authorization", "Bearer invalid").expect(401);
});

test("malformed JSON receives a safe client error instead of an internal error", async () => {
  const { app } = makeTestApp();
  const response = await request(app)
    .put("/api/admin/slots/A-01")
    .set("Authorization", `Bearer ${tokenFor("Administrator")}`)
    .set("Content-Type", "application/json")
    .send("{\"zone\":")
    .expect(400);

  assert.deepEqual(response.body, { error: "Request body must contain valid JSON" });
});

test("oversized JSON receives a safe 413 response", async () => {
  const { app } = makeTestApp();
  const response = await request(app)
    .put("/api/admin/slots/A-01")
    .set("Authorization", `Bearer ${tokenFor("Administrator")}`)
    .send({ zone: "x".repeat(34_000) })
    .expect(413);

  assert.deepEqual(response.body, { error: "Request body is too large" });
});

test("unexpected server errors do not expose internal details", async () => {
  const app = createApp({
    jwtSecret,
    ParkingSlot: { find: () => { throw new Error("private database connection detail"); } },
    PricingRule: { find: () => ({ sort: async () => [] }) }
  });
  const originalError = console.error;
  console.error = () => {};

  try {
    const response = await request(app)
      .get("/api/admin/slots")
      .set("Authorization", `Bearer ${tokenFor("Administrator")}`)
      .expect(500);
    assert.deepEqual(response.body, { error: "An unexpected error occurred" });
    assert.doesNotMatch(JSON.stringify(response.body), /private database/);
  } finally {
    console.error = originalError;
  }
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
    activeTicket: null,
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

test("administrator cannot reconfigure a slot while an active ticket owns it", async () => {
  const app = createApp({
    jwtSecret,
    ParkingSlot: {
      find: () => ({ sort: async () => [] }),
      findOneAndUpdate: async () => null
    },
    PricingRule: { find: () => ({ sort: async () => [] }) }
  });
  const response = await request(app)
    .put("/api/admin/slots/A-01")
    .set("Authorization", `Bearer ${tokenFor("Administrator")}`)
    .send({ zone: "North", vehicleType: "Car", status: "Available" })
    .expect(409);

  assert.deepEqual(response.body, { error: "An active parking slot cannot be reconfigured" });
});