export function parseReportRange(query) {
  const from = parseDate(query.from, "From date");
  const to = parseDate(query.to, "To date");
  const endExclusive = to ? new Date(to.getTime() + 24 * 60 * 60 * 1000) : null;

  if (from && endExclusive && from >= endExclusive) {
    throw new TypeError("From date must be on or before the to date");
  }

  return { from, to: endExclusive };
}

function parseDate(value, label) {
  if (value === undefined || value === "") return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new TypeError(`${label} must use YYYY-MM-DD format`);
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new TypeError(`${label} is not a valid date`);
  }

  return date;
}

function csvCell(value) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

export function formatReportCsv(report) {
  const rows = [
    ["Metric", "Value"],
    ["From date", report.period.from ?? "All dates"],
    ["To date", report.period.to ?? "All dates"],
    ["Available slots", report.occupancy.available],
    ["Occupied slots", report.occupancy.occupied],
    ["Reserved slots", report.occupancy.reserved],
    ["Completed parking sessions", report.completedSessions],
    ["Paid transactions", report.revenue.transactionCount],
    ["Revenue", report.revenue.amount.toFixed(2)]
  ];

  return `${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}\r\n`;
}

export async function collectReport({ ParkingSlot, ParkingSession, ParkingTransaction }, range) {
  const sessionMatch = {};
  const paymentMatch = { status: "Paid" };
  if (range.from || range.to) {
    const enteredAt = {};
    const paidAt = {};
    if (range.from) {
      enteredAt.$gte = range.from;
      paidAt.$gte = range.from;
    }
    if (range.to) {
      enteredAt.$lt = range.to;
      paidAt.$lt = range.to;
    }
    sessionMatch.enteredAt = enteredAt;
    paymentMatch.paidAt = paidAt;
  }

  const [sessionTotals, paymentTotals, occupancyCounts] = await Promise.all([
    ParkingSession.aggregate([
      { $match: { ...sessionMatch, exitedAt: { $ne: null } } },
      { $group: { _id: null, completedSessions: { $sum: 1 } } }
    ]),
    ParkingTransaction.aggregate([
      { $match: paymentMatch },
      { $group: { _id: null, transactionCount: { $sum: 1 }, amount: { $sum: "$amount" } } }
    ]),
    ParkingSlot.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ])
  ]);

  const occupancy = { available: 0, occupied: 0, reserved: 0 };
  for (const status of occupancyCounts) {
    const key = status._id.toLowerCase();
    if (key in occupancy) occupancy[key] = status.count;
  }

  return {
    period: {
      from: range.from?.toISOString().slice(0, 10) ?? null,
      to: range.to ? new Date(range.to.getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10) : null
    },
    occupancy,
    completedSessions: sessionTotals[0]?.completedSessions ?? 0,
    revenue: {
      transactionCount: paymentTotals[0]?.transactionCount ?? 0,
      amount: paymentTotals[0]?.amount ?? 0
    }
  };
}