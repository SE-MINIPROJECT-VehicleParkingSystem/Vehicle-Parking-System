import { useEffect, useState } from "react";

const emptySlot = { slotNumber: "", zone: "", vehicleType: "Car", status: "Available" };

async function apiRequest(path, token, options = {}) {
  const response = await fetch(`/api/admin${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers
    }
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `Request failed (${response.status})`);
  return body;
}

export default function ParkingAdmin() {
  const [token, setToken] = useState("");
  const [slots, setSlots] = useState([]);
  const [pricing, setPricing] = useState([]);
  const [slotForm, setSlotForm] = useState(emptySlot);
  const [rateForm, setRateForm] = useState({ vehicleType: "Car", hourlyRate: "" });
  const [reportRange, setReportRange] = useState({ from: "", to: "" });
  const [report, setReport] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);

  async function refresh() {
    if (!token) {
      setSlots([]);
      setPricing([]);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const [slotData, pricingData] = await Promise.all([
        apiRequest("/slots", token),
        apiRequest("/pricing", token)
      ]);
      setSlots(slotData);
      setPricing(pricingData);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadReport() {
    if (!token) {
      setReport(null);
      return;
    }

    setReportLoading(true);
    setError("");
    const query = new URLSearchParams(Object.entries(reportRange).filter(([, value]) => value));
    try {
      setReport(await apiRequest(`/reports${query.size ? `?${query}` : ""}`, token));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setReportLoading(false);
    }
  }

  async function downloadReport() {
    setError("");
    const query = new URLSearchParams(Object.entries(reportRange).filter(([, value]) => value));
    try {
      const response = await fetch(`/api/admin/reports.csv${query.size ? `?${query}` : ""}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || `Request failed (${response.status})`);
      }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = "parking-report.csv";
      link.click();
      URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      refresh();
      loadReport();
    }, 250);
    return () => window.clearTimeout(timer);
  }, [token]);

  async function saveSlot(event) {
    event.preventDefault();
    setMessage("");
    setError("");
    try {
      await apiRequest(`/slots/${encodeURIComponent(slotForm.slotNumber)}`, token, {
        method: "PUT",
        body: JSON.stringify({
          zone: slotForm.zone,
          vehicleType: slotForm.vehicleType,
          status: slotForm.status
        })
      });
      setMessage(`Slot ${slotForm.slotNumber.trim()} saved.`);
      setSlotForm(emptySlot);
      await refresh();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function saveRate(event) {
    event.preventDefault();
    setMessage("");
    setError("");
    try {
      await apiRequest(`/pricing/${encodeURIComponent(rateForm.vehicleType)}`, token, {
        method: "PUT",
        body: JSON.stringify({ hourlyRate: Number(rateForm.hourlyRate) })
      });
      setMessage(`${rateForm.vehicleType} rate saved.`);
      setRateForm((current) => ({ ...current, hourlyRate: "" }));
      await refresh();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  function editSlot(slot) {
    setSlotForm({
      slotNumber: slot.slotNumber,
      zone: slot.zone,
      vehicleType: slot.vehicleType,
      status: slot.status
    });
  }

  function editRate(rule) {
    setRateForm({ vehicleType: rule.vehicleType, hourlyRate: String(rule.hourlyRate) });
  }

  return (
    <main className="workspace">
      <header className="topbar">
        <a className="wordmark" href="#overview" aria-label="Parking operations home">
          <span className="wordmark-mark" aria-hidden="true">P</span>
          <span>Park / Ops</span>
        </a>
        <div className="topbar-meta"><span className="status-light" /> ADMIN CONSOLE</div>
      </header>

      <section className="intro" id="overview">
        <div>
          <p className="eyebrow">FACILITY CONFIGURATION <span>01 / 03</span></p>
          <h1>Slots &amp; rates</h1>
          <p className="intro-copy">Keep the floor plan and pricing rules current.</p>
        </div>
        <div className="connection">
          <label htmlFor="admin-token">Administrator token</label>
          <input
            id="admin-token"
            type="password"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder="Paste access token"
            autoComplete="off"
          />
        </div>
      </section>

      <section className="summary" aria-label="Parking summary">
        <div className="summary-item"><span>REGISTERED SLOTS</span><strong>{slots.length.toString().padStart(2, "0")}</strong></div>
        <div className="summary-item"><span>AVAILABLE</span><strong>{slots.filter((slot) => slot.status === "Available").length.toString().padStart(2, "0")}</strong></div>
        <div className="summary-item"><span>RATE PLANS</span><strong>{pricing.length.toString().padStart(2, "0")}</strong></div>
        <div className="summary-note">{loading ? "Syncing settings" : token ? "Connected to facility data" : "Awaiting administrator access"}</div>
      </section>

      {(error || message) && <div className={`notice ${error ? "notice-error" : "notice-success"}`} role="status">{error || message}</div>}

      <section className="report-section" aria-labelledby="report-heading">
        <div className="report-heading">
          <div className="section-heading">
            <div><p className="eyebrow">PERFORMANCE</p><h2 id="report-heading">Occupancy &amp; revenue</h2></div>
            <span className="section-count">{reportLoading ? "UPDATING" : report ? "SAVED RECORDS" : "ADMIN REPORT"}</span>
          </div>
          <div className="report-actions">
            <label>From<input type="date" value={reportRange.from} onChange={(event) => setReportRange({ ...reportRange, from: event.target.value })} /></label>
            <label>To<input type="date" value={reportRange.to} onChange={(event) => setReportRange({ ...reportRange, to: event.target.value })} /></label>
            <button type="button" className="report-button" disabled={!token || reportLoading} onClick={loadReport}>Run report</button>
            <button type="button" className="export-button" disabled={!token} onClick={downloadReport} aria-label="Export report as CSV">↓ <span>CSV</span></button>
          </div>
        </div>
        <div className="report-metrics">
          <div><span>CURRENT OCCUPANCY</span><strong>{report ? `${report.occupancy.occupied} <small>/ ${slots.length}</small>` : "--"}</strong><em>{report ? `${report.occupancy.available} available · ${report.occupancy.reserved} reserved` : "Connect to load"}</em></div>
          <div><span>COMPLETED SESSIONS</span><strong>{report?.completedSessions.toLocaleString() ?? "--"}</strong><em>{report?.period.from || report?.period.to ? `${report.period.from || "All dates"} – ${report.period.to || "Today"}` : "All saved dates"}</em></div>
          <div><span>PAID REVENUE</span><strong>{report ? report.revenue.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "--"}</strong><em>{report ? `${report.revenue.transactionCount} paid transactions` : "Connect to load"}</em></div>
        </div>
      </section>

      <div className="management-grid">
        <section className="panel" aria-labelledby="slots-heading">
          <div className="section-heading">
            <div><p className="eyebrow">LAYOUT</p><h2 id="slots-heading">Parking slots</h2></div>
            <span className="section-count">{slots.length} TOTAL</span>
          </div>
          <form className="settings-form" onSubmit={saveSlot}>
            <div className="form-row form-row-slot">
              <label>Slot ID<input required maxLength="24" value={slotForm.slotNumber} onChange={(event) => setSlotForm({ ...slotForm, slotNumber: event.target.value })} placeholder="A-01" /></label>
              <label>Zone<input required maxLength="40" value={slotForm.zone} onChange={(event) => setSlotForm({ ...slotForm, zone: event.target.value })} placeholder="North" /></label>
            </div>
            <div className="form-row form-row-slot">
              <label>Vehicle type<input required maxLength="30" value={slotForm.vehicleType} onChange={(event) => setSlotForm({ ...slotForm, vehicleType: event.target.value })} placeholder="Car" /></label>
              <label>Status<select value={slotForm.status} onChange={(event) => setSlotForm({ ...slotForm, status: event.target.value })}><option>Available</option><option>Occupied</option><option>Reserved</option></select></label>
            </div>
            <button type="submit" disabled={!token}>Save slot</button>
          </form>
          <div className="table-wrap">
            <table>
              <thead><tr><th>SLOT</th><th>ZONE</th><th>VEHICLE</th><th>STATUS</th><th><span className="sr-only">Edit</span></th></tr></thead>
              <tbody>
                {slots.map((slot) => <tr key={slot.slotNumber}>
                  <td className="slot-name">{slot.slotNumber}</td><td>{slot.zone}</td><td>{slot.vehicleType}</td>
                  <td><span className={`state state-${slot.status.toLowerCase()}`}>{slot.status}</span></td>
                  <td><button className="text-button" type="button" onClick={() => editSlot(slot)}>Edit</button></td>
                </tr>)}
                {!slots.length && <tr><td className="empty-row" colSpan="5">{token ? "No slots configured yet." : "Connect as an administrator to view slots."}</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel rates-panel" aria-labelledby="rates-heading">
          <div className="section-heading">
            <div><p className="eyebrow">BILLING</p><h2 id="rates-heading">Hourly pricing</h2></div>
            <span className="section-count">{pricing.length} TYPES</span>
          </div>
          <form className="settings-form" onSubmit={saveRate}>
            <div className="form-row form-row-rate">
              <label>Vehicle type<input required maxLength="30" value={rateForm.vehicleType} onChange={(event) => setRateForm({ ...rateForm, vehicleType: event.target.value })} placeholder="Car" /></label>
              <label>Rate / hour<input required type="number" min="0" step="0.01" value={rateForm.hourlyRate} onChange={(event) => setRateForm({ ...rateForm, hourlyRate: event.target.value })} placeholder="0.00" /></label>
            </div>
            <button type="submit" disabled={!token}>Save rate</button>
          </form>
          <div className="rate-list">
            {pricing.map((rule) => <div className="rate-row" key={rule.vehicleType}>
              <div><span className="rate-type">{rule.vehicleType}</span><span className="rate-caption">Per hour · active</span></div>
              <strong>{Number(rule.hourlyRate).toFixed(2)}</strong>
              <button className="text-button" type="button" onClick={() => editRate(rule)}>Edit</button>
            </div>)}
            {!pricing.length && <p className="empty-row">{token ? "No rates configured yet." : "Connect as an administrator to view rates."}</p>}
          </div>
          <p className="change-note"><span aria-hidden="true">↗</span> Rate updates apply to new parking sessions; saved records remain unchanged.</p>
        </section>
      </div>
      <footer className="footer"><span>PARKING OPERATIONS</span><span>SETTINGS / ACCESS CONTROLLED</span></footer>
    </main>
  );
}