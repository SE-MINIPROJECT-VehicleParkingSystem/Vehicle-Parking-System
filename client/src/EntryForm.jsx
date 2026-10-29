import React, { useState } from 'react';

const VEHICLE_TYPES = ['Two-wheeler', 'Four-wheeler', 'Other'];

export default function EntryForm({ apiBaseUrl }) {
  const entriesUrl = `${apiBaseUrl}/entries`;

  const [numberPlate, setNumberPlate] = useState('');
  const [vehicleType, setVehicleType] = useState('Four-wheeler');
  const [busy, setBusy] = useState(false);
  const [entryError, setEntryError] = useState('');
  const [ticket, setTicket] = useState(null);

  async function submitEntry(event) {
    event.preventDefault();
    setEntryError('');
    setTicket(null);
    setBusy(true);

    try {
      const response = await fetch(entriesUrl, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numberPlate, vehicleType }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Could not record the entry.');
      }

      setTicket(result.data);
      setNumberPlate('');
    } catch (err) {
      setEntryError(
        err instanceof TypeError
          ? 'Cannot reach the API. Check that the backend is running.'
          : err.message
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="entry-panel">
      <h2>Log vehicle entry</h2>

      {entryError && (
        <div className="notice failure" role="alert">{entryError}</div>
      )}

      {ticket && (
        <div className="notice success ticket" role="status">
          <p><strong>Entry recorded</strong></p>
          <p>Ticket: {ticket.entryTicketNumber}</p>
          <p>Slot: {ticket.slotId}</p>
          <p>Plate: {ticket.numberPlate}</p>
          <p>Time: {new Date(ticket.entryTime).toLocaleString()}</p>
        </div>
      )}

      <form onSubmit={submitEntry}>
        <label htmlFor="numberPlate">Number plate</label>
        <input
          id="numberPlate"
          value={numberPlate}
          onChange={(e) => setNumberPlate(e.target.value)}
          placeholder="KA01AB1234"
          maxLength={20}
          required
        />

        <label htmlFor="vehicleType">Vehicle type</label>
        <select
          id="vehicleType"
          value={vehicleType}
          onChange={(e) => setVehicleType(e.target.value)}
        >
          {VEHICLE_TYPES.map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>

        <button className="primary-button" type="submit" disabled={busy}>
          {busy ? 'Please wait...' : 'Log entry'}
        </button>
      </form>
    </div>
  );
}