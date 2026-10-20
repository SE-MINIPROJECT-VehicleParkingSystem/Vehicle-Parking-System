
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

const API_URL = 'http://localhost:5000/api/auth';

function App() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    contactNumber: '',
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (!token || !savedUser) return null;

    try {
      return JSON.parse(savedUser);
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return null;
    }
  });

  function updateField(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  function switchMode(nextMode) {
    setMode(nextMode);
    setMessage('');
    setError('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);

    try {
      const isRegister = mode === 'register';
      const endpoint = isRegister ? 'register' : 'login';

      const payload = isRegister
        ? {
            name: form.name.trim(),
            email: form.email.trim(),
            password: form.password,
            contactNumber: form.contactNumber.trim(),
          }
        : {
            email: form.email.trim(),
            password: form.password,
          };

      const response = await fetch(`${API_URL}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'The request failed.');
      }

      if (isRegister) {
        setMessage(result.message || 'Registration successful! You can now log in.');
        setForm({ name: '', email: form.email.trim(), password: '', contactNumber: '' });
        setMode('login');
      } else {
        const data = result.data ?? result;
        const token = data.token;
        const loggedInUser = data.user;

        if (!token) {
          throw new Error('Login succeeded, but the server did not return a token.');
        }

        localStorage.setItem('token', token);

        if (loggedInUser) {
          localStorage.setItem('user', JSON.stringify(loggedInUser));
        }

        setUser(loggedInUser || { email: form.email.trim() });
        setMessage('You have logged in successfully.');
      }
    } catch (err) {
      setError(
        err instanceof TypeError
          ? 'Cannot reach the API. Check that the backend is running on port 5000.'
          : err.message || 'Something went wrong.'
      );
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setForm({ name: '', email: '', password: '', contactNumber: '' });
    setMessage('You have been logged out.');
    setError('');
    setMode('login');
  }

  async function checkAPI() {
    setMessage('');
    setError('');

    try {
      const response = await fetch('http://localhost:5000/api/health');
      const result = await response.json();

      if (!response.ok) throw new Error('The API health check failed.');

      setMessage(result.message || 'The API is running.');
    } catch {
      setError('Cannot reach the API. Make sure the backend is running.');
    }
  }

  return (
    <main className="page">
      <section className="auth-card">
        <div className="brand-mark" aria-hidden="true">P</div>
        <p className="eyebrow">VEHICLE PARKING SYSTEM</p>
        <h1>{user ? 'Welcome!' : mode === 'login' ? 'Welcome back' : 'Create your account'}</h1>
        <p className="subtitle">
          {user
            ? 'You are signed in.'
            : mode === 'login'
              ? 'Sign in to continue to your parking account.'
              : 'Register to get started with hassle-free parking.'}
        </p>

        {message && <div className="notice success" role="status">{message}</div>}
        {error && <div className="notice failure" role="alert">{error}</div>}

        {user ? (
          <div className="signed-in">
            <p><strong>Email:</strong> {user.email || 'Not provided'}</p>
            {user.name && <p><strong>Name:</strong> {user.name}</p>}
            {user.role && <p><strong>Role:</strong> {user.role}</p>}
            <p className="subtitle">
              Authentication is complete. Parking features can be added next.
            </p>
            <button className="primary-button" onClick={logout}>Log out</button>
          </div>
        ) : (
          <>
            <div className="tabs">
              <button
                type="button"
                className={mode === 'login' ? 'tab active' : 'tab'}
                onClick={() => switchMode('login')}
              >
                Login
              </button>
              <button
                type="button"
                className={mode === 'register' ? 'tab active' : 'tab'}
                onClick={() => switchMode('register')}
              >
                Register
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              {mode === 'register' && (
                <>
                  <label htmlFor="name">Full name</label>
                  <input
                    id="name"
                    name="name"
                    value={form.name}
                    onChange={updateField}
                    placeholder="Enter your full name"
                    maxLength={50}
                    autoComplete="name"
                    required
                  />

                  <label htmlFor="contactNumber">Contact number</label>
                  <input
                    id="contactNumber"
                    name="contactNumber"
                    value={form.contactNumber}
                    onChange={updateField}
                    placeholder="Enter your contact number"
                    maxLength={15}
                    autoComplete="tel"
                    required
                  />
                </>
              )}

              <label htmlFor="email">Email address</label>
              <input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={updateField}
                placeholder="you@example.com"
                maxLength={100}
                autoComplete="email"
                required
              />

              <label htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                value={form.password}
                onChange={updateField}
                placeholder="Enter your password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
              />

              <button className="primary-button" type="submit" disabled={loading}>
                {loading
                  ? 'Please wait...'
                  : mode === 'login'
                    ? 'Sign in'
                    : 'Create account'}
              </button>
            </form>

            <p className="switch-copy">
              {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
              {' '}
              <button
                className="text-button"
                type="button"
                onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
              >
                {mode === 'login' ? 'Register' : 'Sign in'}
              </button>
            </p>
          </>
        )}

        <button className="health-link" type="button" onClick={checkAPI}>
          Check API status
        </button>
      </section>
      <footer>Vehicle Parking System · Sprint 1</footer>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
