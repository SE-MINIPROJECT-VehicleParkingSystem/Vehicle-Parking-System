
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
  const resetToken = new URLSearchParams(window.location.search).get('token');

  const [mode, setMode] = useState(
    resetToken ? 'reset' : 'login'
  );

  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

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
    setPassword('');
    setConfirmPassword('');
    setMessage('');
    setError('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage('');
    setError('');

    const isRegister = mode === 'register';

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setError('Enter a valid email address.');
      return;
    }

    if (isRegister) {
      if (form.name.trim().length < 2 || form.name.trim().length > 50) {
        setError('Name must contain 2 to 50 characters.');
        return;
      }

      if (!form.contactNumber.trim() || form.contactNumber.trim().length > 15) {
        setError('Enter a valid contact number.');
        return;
      }
    }

    if (
      typeof form.password !== 'string' ||
      (isRegister && (form.password.length < 8 || form.password.length > 128))
    ) {
      setError('Password must contain between 8 and 128 characters.');
      return;
    }

    setLoading(true);

    try {
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
          ? 'Cannot reach the API. Check that the backend is running.'
          : err.message || 'Something went wrong.'
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword(event) {
    event.preventDefault();
    setMessage('');
    setError('');

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setError('Enter a valid email address.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: form.email.trim(),
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.message || 'Could not process your request.');
      }

      setMessage(
        result.message ||
        'If an account exists with this email, a reset link will be sent.'
      );
    } catch (err) {
      setError(
        err instanceof TypeError
          ? 'Cannot reach the API. Check that the backend is running.'
          : err.message || 'Something went wrong.'
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(event) {
    event.preventDefault();
    setMessage('');
    setError('');

    if (!resetToken) {
      setError('Password reset link is missing. Request a new link.');
      return;
    }

    if (password.length < 8 || password.length > 128) {
      setError('Password must contain between 8 and 128 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: resetToken,
          password,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.message || 'Password reset failed.');
      }

      setPassword('');
      setConfirmPassword('');
      setForm((previous) => ({
        ...previous,
        password: '',
      }));

      window.history.replaceState({}, document.title, window.location.pathname);

      setMode('login');
      setMessage(
        result.message || 'Password reset successful. You can now log in.'
      );
    } catch (err) {
      setError(
        err instanceof TypeError
          ? 'Cannot reach the API. Check that the backend is running.'
          : err.message || 'Password reset failed.'
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
            : mode === 'forgot'
              ? 'Forgot password?'
              : mode === 'reset'
                ? 'Reset password'
                : mode === 'login'
                  ? 'Welcome back'
                  : 'Create your account'}
        </h1>

        <p className="subtitle">
          {user
            ? 'You are signed in.'
            : mode === 'forgot'
              ? 'Enter your registered email address. We will send you a reset link.'
              : mode === 'reset'
                ? 'Choose a new password for your account.'
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
        ) : mode === 'forgot' ? (
          <>
            <form onSubmit={handleForgotPassword}>
              <label htmlFor="forgotEmail">Email address</label>
              <input
                id="forgotEmail"
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    email: event.target.value,
                  }))
                }
                placeholder="you@example.com"
                autoComplete="email"
                maxLength={100}
                required
              />

              <button
                className="primary-button"
                type="submit"
                disabled={loading}
              >
                {loading ? 'Sending...' : 'Send reset link'}
              </button>
            </form>

            <p className="switch-copy">
              Remember your password?{' '}
              <button
                className="text-button"
                type="button"
                onClick={() => switchMode('login')}
              >
                Back to login
              </button>
            </p>
          </>
        ) : mode === 'reset' ? (
          <>
            <form onSubmit={handleResetPassword}>
              <label htmlFor="newPassword">New password</label>
              <input
                id="newPassword"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter new password"
                autoComplete="new-password"
                minLength={8}
                maxLength={128}
                required
              />

              <label htmlFor="confirmPassword">Confirm password</label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Confirm new password"
                autoComplete="new-password"
                minLength={8}
                maxLength={128}
                required
              />

              <button
                className="primary-button"
                type="submit"
                disabled={loading}
              >
                {loading ? 'Resetting...' : 'Reset password'}
              </button>
            </form>

            <p className="switch-copy">
              <button
                className="text-button"
                type="button"
                onClick={() => switchMode('login')}
              >
                Back to login
              </button>
            </p>
          </>
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

            {mode === 'login' && (
              <p className="switch-copy">
                <button
                  className="text-button"
                  type="button"
                  onClick={() => switchMode('forgot')}
                >
                  Forgot password?
                </button>
              </p>
            )}

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
