import assert from "node:assert/strict";
import test from "node:test";
import { collectReport, formatReportCsv, parseReportRange } from "../src/reports.js";

test("report date range includes the complete end date", () => {
  const range = parseReportRange({ from: "2026-03-01", to: "2026-03-31" });
  assert.equal(range.from.toISOString(), "2026-03-01T00:00:00.000Z");
  assert.equal(range.to.toISOString(), "2026-04-01T00:00:00.000Z");
});

test("report date range rejects malformed and impossible dates", () => {
  assert.throws(() => parseReportRange({ from: "2026-2-01" }), /YYYY-MM-DD/);
  assert.throws(() => parseReportRange({ to: "2026-02-30" }), /valid date/);
  assert.throws(() => parseReportRange({ from: "2026-04-01", to: "2026-03-31" }), /on or before/);
});

test("report totals use completed sessions, paid transactions, and current slot states", async () => {
  const captured = [];
  const report = await collectReport({
    ParkingSession: { aggregate: async (pipeline) => { captured.push(pipeline); return [{ completedSessions: 7 }]; } },
    ParkingTransaction: { aggregate: async (pipeline) => { captured.push(pipeline); return [{ transactionCount: 6, amount: 125.5 }]; } },
    ParkingSlot: { aggregate: async (pipeline) => { captured.push(pipeline); return [{ _id: "Available", count: 10 }, { _id: "Occupied", count: 4 }]; } }
  }, parseReportRange({ from: "2026-03-01", to: "2026-03-31" }));

  assert.deepEqual(report, {
    period: { from: "2026-03-01", to: "2026-03-31" },
    occupancy: { available: 10, occupied: 4, reserved: 0 },
    completedSessions: 7,
    revenue: { transactionCount: 6, amount: 125.5 }
  });
  assert.deepEqual(captured[1][0].$match.status, "Paid");
  assert.equal(captured[1][0].$match.paidAt.$lt.toISOString(), "2026-04-01T00:00:00.000Z");
});

test("CSV export quotes fields and includes all report totals", () => {
  const csv = formatReportCsv({
    period: { from: "2026-03-01", to: "2026-03-31" },
    occupancy: { available: 10, occupied: 4, reserved: 2 },
    completedSessions: 7,
    revenue: { transactionCount: 6, amount: 125.5 }
  });

  assert.match(csv, /"Completed parking sessions","7"/);
  assert.match(csv, /"Revenue","125\.50"/);
  assert.ok(csv.endsWith("\r\n"));
});