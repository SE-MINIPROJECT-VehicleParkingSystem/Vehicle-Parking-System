import React, { useCallback, useEffect, useState } from 'react';

const VEHICLE_TYPES = ['Two-wheeler', 'Four-wheeler', 'Other'];
const REFRESH_MS = 10000;

export default function SlotAvailability({ apiBaseUrl }) {
  const [vehicleType, setVehicleType] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (vehicleType) params.set('vehicleType', vehicleType);
    if (statusFilter) params.set('status', statusFilter);
    const query = params.toString();

    try {
      const response = await fetch(
        `${apiBaseUrl}/slots${query ? `?${query}` : ''}`,
        { credentials: 'include' }
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Slot availability is currently unavailable.');
      }

      setData(result.data);
      setError('');
    } catch (err) {
      // Keep the last good data on screen, but tell the user it may be out of date.
      setError(
        err instanceof TypeError
          ? 'Slot availability is currently unavailable. Check that the backend is running.'
          : err.message
      );
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl, vehicleType, statusFilter]);

  // Load now, then poll so the view follows vehicle entries and exits.
  useEffect(() => {
    setLoading(true);
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  const summary = data?.summary;

  return (
    <div className="slot-panel">
      <h2>Parking slot availability</h2>

      {error && (
        <div className="notice failure" role="alert">
          {error}
          {data && ' The slots shown below may be out of date.'}
        </div>
      )}

      {summary && (
        <div className="slot-summary" aria-label="Slot counts">
          <span className="slot-count available">Available: {summary.available}</span>
          <span className="slot-count occupied">Occupied: {summary.occupied}</span>
          {summary.reserved > 0 && (
            <span className="slot-count reserved">Reserved: {summary.reserved}</span>
          )}
          <span className="slot-count">Total: {summary.total}</span>
        </div>
      )}

      <div className="slot-filters">
        <select
          aria-label="Filter by vehicle type"
          value={vehicleType}
          onChange={(e) => setVehicleType(e.target.value)}
        >
          <option value="">All vehicle types</option>
          {VEHICLE_TYPES.map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>

        <select
          aria-label="Filter by status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="Available">Available</option>
          <option value="Occupied">Occupied</option>
          <option value="Reserved">Reserved</option>
        </select>
      </div>

      {loading && !data && <p className="subtitle">Loading slot availability...</p>}

      {data && data.slots.length === 0 && (
        <p className="subtitle">No parking slots match your search.</p>
      )}

      {data && data.slots.length > 0 && (
        <ul className="slot-grid">
          {data.slots.map((slot) => (
            <li
              key={slot.slotId}
              className={`slot-tile ${slot.status.toLowerCase()}`}
              title={`${slot.slotId} · ${slot.vehicleType} · ${slot.status}`}
            >
              <strong>{slot.slotId}</strong>
              <span>{slot.status}</span>
              <small>{slot.vehicleType}</small>
            </li>
          ))}
        </ul>
      )}

      <div className="slot-footer">
        {data && (
          <small>Last updated {new Date(data.updatedAt).toLocaleTimeString()}</small>
        )}
        <button className="text-button" type="button" onClick={load}>
          Refresh now
        </button>
      </div>
    </div>
  );
}