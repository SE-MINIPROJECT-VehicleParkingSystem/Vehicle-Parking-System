import React, { useCallback, useEffect, useState } from 'react';

const VEHICLE_TYPES = ['Two-wheeler', 'Four-wheeler', 'Other'];
const REFRESH_MS = 10000;

export default function SlotAvailability({ apiBaseUrl }) {
  const [vehicleType, setVehicleType] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [numberPlate, setNumberPlate] = useState('');
  const [data, setData] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (vehicleType) params.set('vehicleType', vehicleType);
    if (statusFilter) params.set('status', statusFilter);

    try {
      const [slotResponse, bookingResponse] = await Promise.all([
        fetch(`${apiBaseUrl}/slots?${params}`, {
          credentials: 'include'
        }),
        fetch(`${apiBaseUrl}/bookings/my`, {
          credentials: 'include'
        })
      ]);

      const slotResult = await slotResponse.json();
      const bookingResult = await bookingResponse.json();

      if (!slotResponse.ok) {
        throw new Error(slotResult.message || 'Could not load slots.');
      }

      if (!bookingResponse.ok) {
        throw new Error(bookingResult.message || 'Could not load bookings.');
      }

      setData(slotResult.data);
      setBookings(bookingResult.data?.bookings || []);
      setError('');
    } catch (err) {
      setError(
        err instanceof TypeError
          ? 'Cannot connect to the server. Check that the backend is running.'
          : err.message
      );
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl, vehicleType, statusFilter]);

  useEffect(() => {
    setLoading(true);
    load();

    const timer = setInterval(load, REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  async function bookSlot(slot) {
    const plate = numberPlate.trim().toUpperCase();

    if (!/^[A-Z0-9]{4,15}$/.test(plate)) {
      setError('Enter a valid vehicle number plate (4–15 letters or digits).');
      return;
    }

    setBusy(slot.slotId);
    setError('');
    setMessage('');

    try {
      const response = await fetch(`${apiBaseUrl}/bookings`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slotId: slot.slotId,
          vehicleNumberPlate: plate
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Booking failed.');
      }

      setMessage(`Successfully booked slot ${slot.slotId}.`);
      setNumberPlate('');
      await load();
    } catch (err) {
      setError(err.message || 'Booking failed.');
    } finally {
      setBusy('');
    }
  }

  async function cancelBooking(id) {
    if (!window.confirm('Are you sure you want to cancel this booking?')) {
      return;
    }

    setBusy(id);
    setError('');
    setMessage('');

    try {
      const response = await fetch(`${apiBaseUrl}/bookings/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Cancellation failed.');
      }

      setMessage('Booking cancelled. The parking slot is now available.');
      await load();
    } catch (err) {
      setError(err.message || 'Cancellation failed.');
    } finally {
      setBusy('');
    }
  }

  const summary = data?.summary;

  return (
    <div className="slot-panel">
      <h2>Parking slot availability</h2>

      {error && <div className="notice failure" role="alert">{error}</div>}
      {message && <div className="notice success" role="status">{message}</div>}

      {summary && (
        <div className="slot-summary">
          <span className="slot-count available">Available: {summary.available}</span>
          <span className="slot-count occupied">Occupied: {summary.occupied}</span>
          <span className="slot-count reserved">Reserved: {summary.reserved}</span>
          <span className="slot-count">Total: {summary.total}</span>
        </div>
      )}

      <div className="booking-input">
        <label htmlFor="bookingPlate">Vehicle number plate</label>
        <input
          id="bookingPlate"
          value={numberPlate}
          onChange={(e) => setNumberPlate(e.target.value.toUpperCase())}
          placeholder="Example: KA01AB1234"
          maxLength={15}
        />
        <small>Enter your vehicle number plate before booking a slot.</small>
      </div>

      <div className="slot-filters">
        <select value={vehicleType} onChange={(e) => setVehicleType(e.target.value)}>
          <option value="">All vehicle types</option>
          {VEHICLE_TYPES.map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>

        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          <option value="Available">Available</option>
          <option value="Occupied">Occupied</option>
          <option value="Reserved">Reserved</option>
        </select>
      </div>

      {loading && !data && <p>Loading parking slots...</p>}

      {data && data.slots.length === 0 && (
        <p className="subtitle">No slots match your search.</p>
      )}

      {data && data.slots.length > 0 && (
        <ul className="slot-grid">
          {data.slots.map((slot) => (
            <li
              key={slot.slotId}
              className={`slot-tile ${slot.status.toLowerCase()}`}
            >
              <strong>{slot.slotId}</strong>
              <span>{slot.status}</span>
              <small>{slot.vehicleType}</small>

              {slot.status === 'Available' && (
                <button
                  className="book-button"
                  type="button"
                  disabled={Boolean(busy)}
                  onClick={() => bookSlot(slot)}
                >
                  {busy === slot.slotId ? 'Booking...' : 'Book slot'}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <section className="my-bookings">
        <h2>My bookings</h2>

        {bookings.length === 0 ? (
          <p className="subtitle">You have no bookings yet.</p>
        ) : (
          bookings.map((booking) => (
            <div className="booking-card" key={booking._id}>
              <div>
                <strong>{booking.slotId}</strong>
                <p>Vehicle: {booking.vehicleNumberPlate}</p>
                <p>Type: {booking.vehicleType}</p>
                <p>Status: <strong>{booking.status}</strong></p>
                <small>
                  Booked: {new Date(booking.bookingTime).toLocaleString()}
                </small>
              </div>

              {booking.status === 'Booked' && (
                <button
                  className="cancel-button"
                  type="button"
                  disabled={Boolean(busy)}
                  onClick={() => cancelBooking(booking._id)}
                >
                  {busy === booking._id ? 'Cancelling...' : 'Cancel booking'}
                </button>
              )}
            </div>
          ))
        )}
      </section>

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