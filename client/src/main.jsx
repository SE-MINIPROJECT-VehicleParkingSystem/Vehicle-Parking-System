import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';
import EntryForm from './EntryForm.jsx';
import SlotAvailability from './SlotAvailability.jsx';
import ExitForm from './ExitForm.jsx';

const API_BASE_URL = (
  import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
).replace(/\/+$/, '');

const API_URL = `${API_BASE_URL}/auth`;
const HEALTH_URL = `${API_BASE_URL}/health`;

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
  const [checkingSession, setCheckingSession] = useState(true);

  const [user, setUser] = useState(null);

  // Restore the session using the HTTP-only cookie.
  // The browser sends the cookie automatically; JavaScript cannot read it.
  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      try {
        const response = await fetch(`${API_URL}/me`, {
          method: 'GET',
          credentials: 'include',
        });

        if (!response.ok) {
          if (response.status !== 401) {
            throw new Error('Could not check your login session.');
          }
          return;
        }

        const result = await response.json();
        const data = result.data ?? result;

        if (!cancelled && data.user) {
          setUser(data.user);
        }
      } catch {
        if (!cancelled) {
          setError(
            'Could not connect to the authentication service. Check that the backend is running.'
          );
        }
      } finally {
        if (!cancelled) {
          setCheckingSession(false);
        }
      }
    }

    restoreSession();

    return () => {
      cancelled = true;
    };
  }, []);

  function updateField(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
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
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'The request failed.');
      }

      const data = result.data ?? result;

      if (isRegister) {
        setMessage(
          result.message || 'Registration successful! You can now log in.'
        );

        setForm({
          name: '',
          email: form.email.trim(),
          password: '',
          contactNumber: '',
        });

        setMode('login');
      } else {
        // The backend must set the JWT in an HTTP-only cookie.
        // Never read or store the JWT in localStorage.
        if (!data.user) {
          throw new Error(
            'Login response did not contain user information.'
          );
        }

        setUser(data.user);
        setForm((previous) => ({
          ...previous,
          password: '',
        }));
        setMessage('You have logged in successfully.');
      }
    } catch (err) {
      setError(
        err instanceof TypeError
          ? 'Cannot reach the API. Check that the backend is running and the API URL is correct.'
          : err.message || 'Something went wrong.'
      );
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    setMessage('');
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/logout`, {
        method: 'POST',
        credentials: 'include',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Logout failed.');
      }

      setUser(null);
      setForm({
        name: '',
        email: '',
        password: '',
        contactNumber: '',
      });
      setMode('login');
      setMessage('You have been logged out.');
    } catch (err) {
      setError(
        err instanceof TypeError
          ? 'Cannot reach the API. Please try again.'
          : err.message || 'Logout failed.'
      );
    } finally {
      setLoading(false);
    }
  }

  async function checkAPI() {
    setMessage('');
    setError('');

    try {
      const response = await fetch(HEALTH_URL, {
        credentials: 'include',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'The API health check failed.');
      }

      setMessage(result.message || 'The API is running.');
    } catch (err) {
      setError(
        err instanceof TypeError
          ? 'Cannot reach the API. Make sure the backend is running.'
          : err.message || 'The API health check failed.'
      );
    }
  }

  if (checkingSession) {
    return (
      <main className="page">
        <section className="auth-card">
          <div className="brand-mark" aria-hidden="true">P</div>
          <p className="eyebrow">VEHICLE PARKING SYSTEM</p>
          <h1>Checking your session...</h1>
          <p className="subtitle">
            Please wait while we check your login status.
          </p>
        </section>
        <footer>Vehicle Parking System · Sprint 1</footer>
      </main>
    );
  }

  return (
    <main className="page">
      <section className="auth-card">
        <div className="brand-mark" aria-hidden="true">P</div>

        <p className="eyebrow">VEHICLE PARKING SYSTEM</p>

        <h1>
          {user
            ? 'Welcome!'
            : mode === 'login'
              ? 'Welcome back'
              : 'Create your account'}
        </h1>

        <p className="subtitle">
          {user
            ? 'You are signed in.'
            : mode === 'login'
              ? 'Sign in to continue to your parking account.'
              : 'Register to get started with hassle-free parking.'}
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

        {user ? (
          <div className="signed-in">
            <p>
              <strong>Email:</strong> {user.email || 'Not provided'}
            </p>

            {user.name && (
              <p>
                <strong>Name:</strong> {user.name}
              </p>
            )}

            {user.role && (
              <p>
                <strong>Role:</strong> {user.role}
              </p>
            )}

            <SlotAvailability apiBaseUrl={API_BASE_URL} />

            {user.role === 'Staff' || user.role === 'Admin' ? (
              <>
                <EntryForm apiBaseUrl={API_BASE_URL} />
                <ExitForm apiBaseUrl={API_BASE_URL} />
              </>
            ) : (
              <p className="subtitle">
                Parking entry and exit are available to gate staff only.
              </p>
            )}

            <button
              className="primary-button"
              type="button"
              onClick={logout}
              disabled={loading}
            >
              {loading ? 'Please wait...' : 'Log out'}
            </button>
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
                autoComplete={
                  mode === 'login' ? 'current-password' : 'new-password'
                }
                required
              />

              <button
                className="primary-button"
                type="submit"
                disabled={loading}
              >
                {loading
                  ? 'Please wait...'
                  : mode === 'login'
                    ? 'Sign in'
                    : 'Create account'}
              </button>
            </form>

            <p className="switch-copy">
              {mode === 'login'
                ? "Don't have an account?"
                : 'Already have an account?'}{' '}

              <button
                className="text-button"
                type="button"
                onClick={() =>
                  switchMode(mode === 'login' ? 'register' : 'login')
                }
              >
                {mode === 'login' ? 'Register' : 'Sign in'}
              </button>
            </p>
          </>
        )}

        <button
          className="health-link"
          type="button"
          onClick={checkAPI}
        >
          Check API status
        </button>
      </section>

      <footer>Vehicle Parking System · Sprint 1</footer>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);