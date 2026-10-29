import assert from "node:assert/strict";
import test from "node:test";
import jwt from "jsonwebtoken";
import request from "supertest";
import { createApp } from "../src/server.js";

const jwtSecret = "report-test-secret";

function makeReportApp() {
  const aggregate = (results) => async () => results;
  return createApp({
    jwtSecret,
    ParkingSlot: {
      find: () => ({ sort: async () => [] }),
      aggregate: aggregate([{ _id: "Available", count: 8 }, { _id: "Occupied", count: 2 }])
    },
    PricingRule: { find: () => ({ sort: async () => [] }) },
    ParkingSession: { aggregate: aggregate([{ completedSessions: 4 }]) },
    ParkingTransaction: { aggregate: aggregate([{ transactionCount: 3, amount: 48.5 }]) }
  });
}

const authorization = `Bearer ${jwt.sign({ role: "Administrator" }, jwtSecret)}`;

test("report JSON endpoint returns aggregated operational totals", async () => {
  const response = await request(makeReportApp())
    .get("/api/admin/reports?from=2026-03-01&to=2026-03-31")
    .set("Authorization", authorization)
    .expect(200);

  assert.deepEqual(response.body, {
    period: { from: "2026-03-01", to: "2026-03-31" },
    occupancy: { available: 8, occupied: 2, reserved: 0 },
    completedSessions: 4,
    revenue: { transactionCount: 3, amount: 48.5 }
  });
});

test("report CSV endpoint returns a downloadable CSV and validates date filters", async () => {
  const csv = await request(makeReportApp())
    .get("/api/admin/reports.csv")
    .set("Authorization", authorization)
    .expect(200)
    .expect("Content-Type", /text\/csv/)
    .expect("Content-Disposition", /attachment; filename="parking-report\.csv"/);
  assert.match(csv.text, /"Revenue","48\.50"/);

  await request(makeReportApp())
    .get("/api/admin/reports?from=not-a-date")
    .set("Authorization", authorization)
    .expect(400);
});