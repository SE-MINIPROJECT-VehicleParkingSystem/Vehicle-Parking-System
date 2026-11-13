
import React, { useState } from 'react';

export default function StaffProvisioning({ apiBaseUrl }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    contactNumber: '',
    password: ''
  });

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function updateField(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value
    }));

    setError('');
    setMessage('');
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError('');
    setMessage('');

    if (form.password.length < 8 || form.password.length > 128) {
      setError('Password must contain between 8 and 128 characters.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${apiBaseUrl}/admin/staff`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          contactNumber: form.contactNumber.trim(),
          password: form.password
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Could not create Staff account.');
      }

      setMessage(
        result.message || 'Staff account created successfully.'
      );

      setForm({
        name: '',
        email: '',
        contactNumber: '',
        password: ''
      });
    } catch (err) {
      setError(
        err instanceof TypeError
          ? 'Cannot connect to the backend.'
          : err.message
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="staff-provisioning">
      <h2>Staff Account Provisioning</h2>

      <p className="admin-subtitle">
        Create accounts for parking gate staff.
      </p>

      {message && (
        <div className="notice success" role="status">
          {message}
        </div>
      )}

      {error && (
        <div className="notice failure" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <label htmlFor="staffName">Staff name</label>
        <input
          id="staffName"
          name="name"
          value={form.name}
          onChange={updateField}
          placeholder="Enter staff name"
          minLength={2}
          maxLength={50}
          required
        />

        <label htmlFor="staffEmail">Email address</label>
        <input
          id="staffEmail"
          name="email"
          type="email"
          value={form.email}
          onChange={updateField}
          placeholder="staff@example.com"
          maxLength={100}
          required
        />

        <label htmlFor="staffContact">Contact number</label>
        <input
          id="staffContact"
          name="contactNumber"
          value={form.contactNumber}
          onChange={updateField}
          placeholder="Enter contact number"
          maxLength={15}
          required
        />

        <label htmlFor="staffPassword">Initial password</label>
        <input
          id="staffPassword"
          name="password"
          type="password"
          value={form.password}
          onChange={updateField}
          placeholder="Minimum 8 characters"
          minLength={8}
          maxLength={128}
          required
        />

        <button
          className="primary-button"
          type="submit"
          disabled={loading}
        >
          {loading ? 'Creating account...' : 'Create Staff Account'}
        </button>
      </form>
    </section>
  );
}
