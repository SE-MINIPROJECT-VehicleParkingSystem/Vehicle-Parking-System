import React, { useState } from 'react';

export default function ExitForm({ apiBaseUrl }) {
  const [numberPlate, setNumberPlate] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [exitDetails, setExitDetails] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [receiptLoading, setReceiptLoading] = useState(false);

  async function recordExit(event) {
    event.preventDefault();

    setError('');
    setExitDetails(null);
    setReceipt(null);
    setBusy(true);

    try {
      const response = await fetch(`${apiBaseUrl}/exits`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          numberPlate: numberPlate.trim().toUpperCase(),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Could not record vehicle exit.');
      }

      setExitDetails(result.data);
      setNumberPlate('');
    } catch (err) {
      setError(
        err instanceof TypeError
          ? 'Cannot reach the API. Check that the backend is running.'
          : err.message
      );
    } finally {
      setBusy(false);
    }
  }

  async function getReceipt() {
    if (!exitDetails?.transactionId) {
      setError('Transaction ID is missing.');
      return;
    }

    setError('');
    setReceipt(null);
    setReceiptLoading(true);

    try {
      const response = await fetch(
        `${apiBaseUrl}/exits/${encodeURIComponent(
          exitDetails.transactionId
        )}/receipt`,
        {
          method: 'GET',
          credentials: 'include',
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Could not retrieve receipt.');
      }

      setReceipt(result.data);
    } catch (err) {
      setError(
        err instanceof TypeError
          ? 'Cannot reach the API. Check that the backend is running.'
          : err.message
      );
    } finally {
      setReceiptLoading(false);
    }
  }

  return (
    <div className="exit-panel">
      <h2>Log vehicle exit</h2>

      {error && (
        <div className="notice failure" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={recordExit}>
        <label htmlFor="exitNumberPlate">Vehicle number plate</label>

        <input
          id="exitNumberPlate"
          value={numberPlate}
          onChange={(event) => setNumberPlate(event.target.value)}
          placeholder="KA01AB1234"
          maxLength={20}
          required
        />

        <button className="primary-button" type="submit" disabled={busy}>
          {busy ? 'Please wait...' : 'Record exit'}
        </button>
      </form>

      {exitDetails && (
        <div className="notice success exit-result" role="status">
          <h3>Vehicle exit recorded</h3>

          <p><strong>Vehicle:</strong> {exitDetails.numberPlate}</p>
          <p><strong>Slot:</strong> {exitDetails.slotId}</p>
          <p>
            <strong>Entry time:</strong>{' '}
            {new Date(exitDetails.entryTime).toLocaleString()}
          </p>
          <p>
            <strong>Exit time:</strong>{' '}
            {new Date(exitDetails.exitTime).toLocaleString()}
          </p>
          <p><strong>Duration:</strong> {exitDetails.durationMinutes} minutes</p>
          <p><strong>Fee:</strong> {exitDetails.currency} {exitDetails.fee}</p>
          <p><strong>Payment:</strong> {exitDetails.paymentStatus}</p>
          <p><strong>Transaction ID:</strong> {exitDetails.transactionId}</p>

          <button
            className="primary-button"
            type="button"
            onClick={getReceipt}
            disabled={receiptLoading}
          >
            {receiptLoading ? 'Loading receipt...' : 'View saved receipt'}
          </button>
        </div>
      )}

      {receipt && (
        <div className="receipt-card" id="parking-receipt">
          <h3>Parking Receipt</h3>

          <p><strong>Receipt number:</strong> {receipt.receiptNumber}</p>
          <p><strong>Transaction ID:</strong> {receipt.transactionId}</p>
          <p><strong>Vehicle number:</strong> {receipt.numberPlate}</p>
          <p><strong>Vehicle type:</strong> {receipt.vehicleType}</p>
          <p><strong>Parking slot:</strong> {receipt.slotId}</p>
          <p>
            <strong>Entry time:</strong>{' '}
            {new Date(receipt.entryTime).toLocaleString()}
          </p>
          <p>
            <strong>Exit time:</strong>{' '}
            {new Date(receipt.exitTime).toLocaleString()}
          </p>
          <p><strong>Fee:</strong> {receipt.fee}</p>
          <p><strong>Payment status:</strong> {receipt.paymentStatus}</p>
          <p>
            <strong>Payment method:</strong>{' '}
            {receipt.paymentMethod || 'Not recorded'}
          </p>

          <button
            className="primary-button"
            type="button"
            onClick={() => window.print()}
          >
            Print receipt
          </button>
        </div>
      )}
    </div>
  );
}
