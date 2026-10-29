import assert from "node:assert/strict";
import test from "node:test";
import { createParkingOperations } from "../src/parkingOperations.js";

function makeStore({ failSessionCreate = false, missingSlotOnExit = false, simulateTransactions = true } = {}) {
  const slots = [{ slotNumber: "A-01", vehicleType: "Car", status: "Available", activeTicket: null }];
  const sessions = [];
  const models = {
    ParkingSlot: {
      findOneAndUpdate: async (filter, update) => {
        const slot = slots.find((item) => Object.entries(filter).every(([key, value]) => item[key] === value));
        if (!slot || (missingSlotOnExit && filter.activeTicket)) return null;
        Object.assign(slot, update.$set);
        return { ...slot };
      }
    },
    ParkingSession: {
      exists: (filter) => Promise.resolve(sessions.some((item) => item.plateNumber === filter.plateNumber && item.active === filter.active)),
      create: async (documents) => {
        if (failSessionCreate) throw new Error("write failed");
        sessions.push(...documents);
        return documents;
      },
      findOneAndUpdate: async (filter, update) => {
        const record = sessions.find((item) => Object.entries(filter).every(([key, value]) => item[key] === value));
        if (!record) return null;
        Object.assign(record, update.$set);
        return { ...record };
      }
    }
  };

  const runTransaction = async (operation) => {
    if (!simulateTransactions) return operation({ testTransaction: true });
    const savedSlots = structuredClone(slots);
    const savedSessions = structuredClone(sessions);
    try {
      return await operation({ testTransaction: true });
    } catch (error) {
      slots.splice(0, slots.length, ...savedSlots);
      sessions.splice(0, sessions.length, ...savedSessions);
      throw error;
    }
  };

  return { slots, sessions, operations: createParkingOperations({ ...models, runTransaction }) };
}

test("concurrent entries cannot claim the same available slot", async () => {
  const { slots, sessions, operations } = makeStore({ simulateTransactions: false });
  const results = await Promise.allSettled([
    operations.enter({ plateNumber: "ab-123", vehicleType: "Car" }),
    operations.enter({ plateNumber: "CD 456", vehicleType: "Car" })
  ]);

  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(results.filter((result) => result.status === "rejected").length, 1);
  assert.equal(slots.filter((slot) => slot.status === "Occupied").length, 1);
  assert.equal(sessions.filter((record) => record.active).length, 1);
});

test("an active vehicle cannot be checked in twice", async () => {
  const { operations } = makeStore();
  const first = await operations.enter({ plateNumber: "ab-123", vehicleType: "Car" });
  await assert.rejects(() => operations.enter({ plateNumber: "AB123", vehicleType: "Car" }), {
    status: 409,
    message: "This vehicle already has an active parking session"
  });
  assert.ok(first.ticketNumber);
});

test("failed session persistence rolls back the slot claim", async () => {
  const { slots, sessions, operations } = makeStore({ failSessionCreate: true });
  await assert.rejects(() => operations.enter({ plateNumber: "AB123", vehicleType: "Car" }), /write failed/);
  assert.equal(slots[0].status, "Available");
  assert.equal(slots[0].activeTicket, null);
  assert.equal(sessions.length, 0);
});

test("exit releases only the slot associated with the active ticket", async () => {
  const { slots, sessions, operations } = makeStore();
  const entry = await operations.enter({ plateNumber: "AB123", vehicleType: "Car" });
  const exit = await operations.exit(entry.ticketNumber);
  assert.equal(exit.slotNumber, "A-01");
  assert.equal(sessions[0].active, false);
  assert.equal(slots[0].status, "Available");
  assert.equal(slots[0].activeTicket, null);
  await assert.rejects(() => operations.exit(entry.ticketNumber), { status: 404 });
});

test("an inconsistent slot state aborts the exit and preserves the active session", async () => {
  const store = makeStore({ missingSlotOnExit: true });
  const entry = await store.operations.enter({ plateNumber: "AB123", vehicleType: "Car" });
  await assert.rejects(() => store.operations.exit(entry.ticketNumber), { status: 409 });
  assert.equal(store.sessions[0].active, true);
});

test("entry validation rejects malformed plates and missing vehicle types", async () => {
  const { operations } = makeStore();
  await assert.rejects(() => operations.enter({ plateNumber: "!", vehicleType: "Car" }), /Plate number/);
  await assert.rejects(() => operations.enter({ plateNumber: "AB123", vehicleType: " " }), /Vehicle type/);
});