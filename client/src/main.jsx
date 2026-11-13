
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';
import EntryForm from './EntryForm.jsx';
import SlotAvailability from './SlotAvailability.jsx';
import ExitForm from './ExitForm.jsx';
import AdminDashboard from './AdminDashboard.jsx';

const API_BASE_URL = (
  import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
).replace(/\/+$/, '');

const API_URL = `${API_BASE_URL}/auth`;
const HEALTH_URL = `${API_BASE_URL}/health`;

function App() {
  const [mode, setMode] = useState('login');
  const [showPassword, setShowPassword] = useState(false);

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

    setError('');
  }

  function switchMode(nextMode) {
    setMode(nextMode);
    setShowPassword(false);
    setMessage('');
    setError('');
  }

  function validateForm() {
    const email = form.email.trim();
    const password = form.password;

    if (mode === 'register') {
      const name = form.name.trim();
      const contactNumber = form.contactNumber.trim();

      if (name.length < 2 || name.length > 50) {
        return 'Name must contain between 2 and 50 characters.';
      }

      if (!contactNumber || contactNumber.length > 15) {
        return 'Enter a valid contact number (maximum 15 characters).';
      }
    }

    if (!email) {
      return 'Please enter your email address.';
    }

    if (email.length > 100 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return 'Please enter a valid email address.';
    }

    if (!password) {
      return 'Please enter your password.';
    }

    if (mode === 'register' &&
        (password.length < 8 || password.length > 128)) {
      return 'Password must contain between 8 and 128 characters.';
    }

    return '';
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setMessage('');
    setError('');

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

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

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result.message ||
          (response.status === 401
            ? 'Invalid email or password.'
            : response.status === 423
              ? 'Your account is temporarily locked. Try again later.'
              : 'The request failed. Please try again.')
        );
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
        setShowPassword(false);
      } else {
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

        setShowPassword(false);
        setMessage('You have logged in successfully.');
      }
    } catch (err) {
      setError(
        err instanceof TypeError
          ? 'Cannot connect to the server. Check that the backend is running.'
          : err.message || 'Something went wrong. Please try again.'
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
      setShowPassword(false);
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

            {user.role === 'Admin' ? (
              <AdminDashboard apiBaseUrl={API_BASE_URL} />
            ) : (
              <>
                <SlotAvailability apiBaseUrl={API_BASE_URL} />

                {user.role === 'Staff' ? (
                  <>
                    <EntryForm apiBaseUrl={API_BASE_URL} />
                    <ExitForm apiBaseUrl={API_BASE_URL} />
                  </>
                ) : (
                  <p className="subtitle">
                    Parking entry and exit are available to gate staff only.
                  </p>
                )}
              </>
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

            <form onSubmit={handleSubmit} noValidate>
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

              <div className="password-field">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={updateField}
                  placeholder="Enter your password"
                  autoComplete={
                    mode === 'login' ? 'current-password' : 'new-password'
                  }
                  required
                />

                <button
                  className="password-toggle"
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>

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
