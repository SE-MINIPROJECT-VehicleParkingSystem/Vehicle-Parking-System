
import React, { useCallback, useEffect, useState } from 'react';

export default function AdminDashboard({ apiBaseUrl }) {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadDashboard = useCallback(async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/admin/dashboard`, {
        method: 'GET',
        credentials: 'include',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || 'Could not load the Admin dashboard.'
        );
      }

      const data = result.data ?? result;

      setDashboard(data);
      setLastUpdated(new Date());
      setError('');
    } catch (err) {
      setError(
        err instanceof TypeError
          ? 'Cannot connect to the backend. Check that the server is running.'
          : err.message
      );
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl]);

  useEffect(() => {
    loadDashboard();

    const timer = setInterval(loadDashboard, 10000);

    return () => clearInterval(timer);
  }, [loadDashboard]);

  if (loading && !dashboard) {
    return (
      <section className="admin-dashboard">
        <p className="subtitle">Loading Admin dashboard...</p>
      </section>
    );
  }

  const summary = dashboard?.summary;
  const slots = dashboard?.slots ?? [];
  const transactions = dashboard?.recentTransactions ?? [];

  return (
    <section className="admin-dashboard">
      <div className="admin-dashboard-header">
        <div>
          <p className="admin-eyebrow">ADMINISTRATION</p>
          <h2>Parking Management Dashboard</h2>
          <p className="admin-subtitle">
            Monitor parking operations and saved records.
          </p>
        </div>

        <button
          className="admin-refresh-button"
          type="button"
          onClick={loadDashboard}
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="notice failure" role="alert">
          {error}
        </div>
      )}

      {summary && (
        <>
          <div className="admin-stat-grid">
            <div className="admin-stat-card">
              <span>Total slots</span>
              <strong>{summary.totalSlots}</strong>
            </div>

            <div className="admin-stat-card available-stat">
              <span>Available</span>
              <strong>{summary.availableSlots}</strong>
            </div>

            <div className="admin-stat-card occupied-stat">
              <span>Occupied</span>
              <strong>{summary.occupiedSlots}</strong>
            </div>

            <div className="admin-stat-card reserved-stat">
              <span>Reserved</span>
              <strong>{summary.reservedSlots}</strong>
            </div>
          </div>

          <div className="admin-stat-grid admin-secondary-stats">
            <div className="admin-stat-card">
              <span>Active sessions</span>
              <strong>{summary.activeSessions}</strong>
            </div>

            <div className="admin-stat-card">
              <span>Completed sessions</span>
              <strong>{summary.completedSessions}</strong>
            </div>

            <div className="admin-stat-card">
              <span>Occupancy rate</span>
              <strong>{summary.occupancyRate}%</strong>
            </div>
          </div>
        </>
      )}

      <section className="admin-section">
        <h3>Parking slot information</h3>

        {slots.length === 0 ? (
          <p className="admin-empty">No parking slots found.</p>
        ) : (
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Slot ID</th>
                  <th>Zone</th>
                  <th>Slot number</th>
                  <th>Vehicle type</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {slots.map((slot) => (
                  <tr key={slot.slotId}>
                    <td>{slot.slotId}</td>
                    <td>{slot.zone}</td>
                    <td>{slot.slotNumber}</td>
                    <td>{slot.vehicleType}</td>
                    <td>
                      <span
                        className={`admin-status ${slot.status.toLowerCase()}`}
                      >
                        {slot.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="admin-section">
        <h3>Recent parking transactions</h3>

        {transactions.length === 0 ? (
          <p className="admin-empty">No transactions found.</p>
        ) : (
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>Vehicle number</th>
                  <th>Vehicle type</th>
                  <th>Slot</th>
                  <th>Entry time</th>
                  <th>Exit time</th>
                  <th>Fee</th>
                  <th>Payment</th>
                </tr>
              </thead>

              <tbody>
                {transactions.map((transaction) => (
                  <tr key={transaction.transactionId}>
                    <td>{transaction.entryTicketNumber}</td>
                    <td>{transaction.vehicleNumberPlate}</td>
                    <td>{transaction.vehicleType}</td>
                    <td>{transaction.slotId}</td>
                    <td>
                      {transaction.entryTime
                        ? new Date(transaction.entryTime).toLocaleString()
                        : '—'}
                    </td>
                    <td>
                      {transaction.exitTime
                        ? new Date(transaction.exitTime).toLocaleString()
                        : '—'}
                    </td>
                    <td>
                      {transaction.fee != null
                        ? `₹${transaction.fee}`
                        : '—'}
                    </td>
                    <td>
                      {transaction.paymentStatus || 'Pending'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {lastUpdated && (
        <p className="admin-last-updated">
          Last updated: {lastUpdated.toLocaleTimeString()}
        </p>
      )}
    </section>
  );
}
