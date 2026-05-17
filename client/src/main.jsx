import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const API_BASE_URL = (process.env.REACT_APP_API_URL || '').replace(/\/$/, '');
const apiUrl = (path) => `${API_BASE_URL}${path}`;

const GENERIC_ERROR = 'Something went wrong. Please try again.';

class ApiError extends Error {
  constructor(message, status, details = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

function Notification({ notice, onDismiss }) {
  if (!notice.message) return null;

  return (
    <div className={`notice ${notice.type}`} role="alert">
      <div>
        <strong>{notice.type === 'success' ? 'Success' : 'Action needed'}</strong>
        <p>{notice.message}</p>
        {notice.details?.length > 0 && (
          <ul>
            {notice.details.map((item, index) => (
              <li key={`${item.field || 'detail'}-${index}`}>
                {item.field ? `${item.field}: ` : ''}
                {item.message}
              </li>
            ))}
          </ul>
        )}
      </div>
      <button type="button" className="notice-close" onClick={onDismiss} aria-label="Dismiss notification">
        Close
      </button>
    </div>
  );
}

function App() {
  const [mode, setMode] = useState('login');
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState('');
  const [refreshToken, setRefreshToken] = useState('');
  const [notes, setNotes] = useState([]);
  const [adminUsers, setAdminUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [notice, setNotice] = useState({ type: '', message: '', details: [] });
  const [loading, setLoading] = useState({});

  const [auth, setAuth] = useState({ name: '', email: '', password: '' });
  const [reset, setReset] = useState({ email: '', token: '', password: '' });
  const [note, setNote] = useState({ title: '', content: '' });

  const isLoading = (key) => Boolean(loading[key]);
  const setActionLoading = (key, value) => {
    setLoading((current) => ({ ...current, [key]: value }));
  };
  const showSuccess = (message, details = []) => setNotice({ type: 'success', message, details });
  const showError = (error) => {
    const fallback = error?.status >= 500 ? GENERIC_ERROR : error?.message || GENERIC_ERROR;
    setNotice({ type: 'error', message: fallback, details: error?.details || [] });
  };
  const clearNotice = () => setNotice({ type: '', message: '', details: [] });

  function clearSession(message = 'Session expired. Please log in again.') {
    setUser(null);
    setAccessToken('');
    setRefreshToken('');
    setNotes([]);
    setAdminUsers([]);
    setAuditLogs([]);
    setNotice({ type: 'error', message, details: [] });
  }

  async function parseResponse(res, context = {}) {
    let data = {};

    if (res.status !== 204) {
      try {
        data = await res.json();
      } catch {
        data = {};
      }
    }

    if (res.ok) return data;

    const details = Array.isArray(data.errors)
      ? data.errors.map((item) => ({
          field: item.field,
          message: item.message || 'Invalid value'
        }))
      : [];

    let message = data.message || GENERIC_ERROR;

    if (res.status >= 500) {
      message = GENERIC_ERROR;
    } else if (res.status === 400 && details.length > 0) {
      message = 'Please fix the highlighted validation errors.';
    } else if (res.status === 401) {
      message = context.preserveAuthMessage
        ? data.message || 'Invalid email or password'
        : 'Your session is no longer valid. Please log in again.';
    } else if (res.status === 403) {
      message = 'You do not have permission to perform this action.';
    } else if (res.status === 423) {
      message = data.message || 'Account locked. Try again later.';
    } else if (res.status === 429) {
      message = data.message || 'Too many requests. Please wait and try again.';
    }

    throw new ApiError(message, res.status, details);
  }

  async function refreshAccessToken() {
    if (!refreshToken) throw new ApiError('Session expired. Please log in again.', 401);

    const res = await fetch(apiUrl('/api/auth/refresh'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });
    const data = await parseResponse(res);

    setAccessToken(data.accessToken);
    return data.accessToken;
  }

  async function request(url, options = {}, retry = true, context = {}) {
    let res;

    try {
      res = await fetch(apiUrl(url), {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          ...options.headers
        }
      });
    } catch {
      throw new ApiError('Unable to reach the server. Check your connection and try again.', 0);
    }

    if (res.status === 401 && retry && refreshToken && !context.preserveAuthMessage) {
      try {
        const newAccessToken = await refreshAccessToken();
        return request(
          url,
          {
            ...options,
            headers: {
              ...options.headers,
              Authorization: `Bearer ${newAccessToken}`
            }
          },
          false,
          context
        );
      } catch (error) {
        clearSession();
        throw error;
      }
    }

    const data = await parseResponse(res, context);
    return data;
  }

  async function runAction(key, action) {
    clearNotice();
    setActionLoading(key, true);
    try {
      await action();
    } catch (error) {
      showError(error);
    } finally {
      setActionLoading(key, false);
    }
  }

  async function handleAuth(e) {
    e.preventDefault();
    await runAction('auth', async () => {
      const body =
        mode === 'login'
          ? { email: auth.email, password: auth.password }
          : { name: auth.name, email: auth.email, password: auth.password };

      const data = await request(
        `/api/auth/${mode}`,
        {
          method: 'POST',
          body: JSON.stringify(body)
        },
        true,
        { preserveAuthMessage: mode === 'login' }
      );

      setUser(data.user);
      setAccessToken(data.accessToken);
      setRefreshToken(data.refreshToken);
      showSuccess(data.message || (mode === 'login' ? 'Login successful' : 'Registration successful'));
      await loadNotes(data.accessToken, { silent: true });

      if (data.user.role === 'admin') {
        await loadAdminDashboard(data.accessToken, { silent: true });
      }
    });
  }

  async function handleForgotPassword(e) {
    e.preventDefault();
    await runAction('forgot', async () => {
      const data = await request('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: reset.email })
      });
      showSuccess(data.message);
    });
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    await runAction('reset', async () => {
      const data = await request('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify(reset)
      });
      showSuccess(data.message);
      setMode('login');
      setReset({ email: '', token: '', password: '' });
    });
  }

  async function loadNotes(token = accessToken, options = {}) {
    const execute = async () => {
      const data = await request('/api/notes', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setNotes(data.notes || []);
      if (!options.silent) showSuccess('Notes refreshed');
    };

    if (options.silent) {
      await execute();
      return;
    }

    await runAction('notes', execute);
  }

  async function loadAdminDashboard(token = accessToken, options = {}) {
    const execute = async () => {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const [usersData, logsData] = await Promise.all([
        request('/api/admin/users', { headers }),
        request('/api/admin/logs', { headers })
      ]);

      setAdminUsers(usersData.users || []);
      setAuditLogs(logsData.logs || []);
      if (!options.silent) showSuccess('Admin data refreshed');
    };

    if (options.silent) {
      await execute();
      return;
    }

    await runAction('adminRefresh', execute);
  }

  async function createNote(e) {
    e.preventDefault();
    await runAction('createNote', async () => {
      const data = await request('/api/notes', {
        method: 'POST',
        body: JSON.stringify(note)
      });

      setNotes([data.note, ...notes]);
      setNote({ title: '', content: '' });
      showSuccess(data.message || 'Note created');
    });
  }

  async function deleteUser(id) {
    await runAction(`deleteUser:${id}`, async () => {
      await request(`/api/admin/users/${id}`, { method: 'DELETE' });
      setAdminUsers(adminUsers.filter((item) => item._id !== id));
      showSuccess('User deleted');
      await loadAdminDashboard(accessToken, { silent: true });
    });
  }

  async function logout() {
    await runAction('logout', async () => {
      try {
        await request('/api/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken })
        });
      } catch {
        // Clear local session even if the token was already expired.
      }

      setUser(null);
      setAccessToken('');
      setRefreshToken('');
      setNotes([]);
      setAdminUsers([]);
      setAuditLogs([]);
      showSuccess('Logged out');
    });
  }

  return (
    <main>
      <header>
        <h1>Secure Notes</h1>
        {user && (
          <div>
            <span>
              {user.name} ({user.role})
            </span>
            <button onClick={logout} disabled={isLoading('logout')}>
              {isLoading('logout') ? 'Logging out...' : 'Logout'}
            </button>
          </div>
        )}
      </header>

      <Notification notice={notice} onDismiss={clearNotice} />

      {!accessToken ? (
        <section>
          <div className="tabs">
            <button type="button" onClick={() => setMode('login')} aria-pressed={mode === 'login'}>
              Login
            </button>
            <button type="button" onClick={() => setMode('register')} aria-pressed={mode === 'register'}>
              Register
            </button>
            <button type="button" onClick={() => setMode('forgot')} aria-pressed={mode === 'forgot'}>
              Forgot Password
            </button>
            <button type="button" onClick={() => setMode('reset')} aria-pressed={mode === 'reset'}>
              Reset Password
            </button>
          </div>

          {(mode === 'login' || mode === 'register') && (
            <form onSubmit={handleAuth}>
              <h2>{mode === 'login' ? 'Login' : 'Register'}</h2>
              {mode === 'register' && (
                <input
                  placeholder="Name"
                  value={auth.name}
                  onChange={(e) => setAuth({ ...auth, name: e.target.value })}
                  disabled={isLoading('auth')}
                />
              )}
              <input
                placeholder="Email"
                value={auth.email}
                onChange={(e) => setAuth({ ...auth, email: e.target.value })}
                disabled={isLoading('auth')}
              />
              <input
                type="password"
                placeholder="Password"
                value={auth.password}
                onChange={(e) => setAuth({ ...auth, password: e.target.value })}
                disabled={isLoading('auth')}
              />
              <button type="submit" disabled={isLoading('auth')}>
                {isLoading('auth') ? 'Submitting...' : 'Submit'}
              </button>
            </form>
          )}

          {mode === 'forgot' && (
            <form onSubmit={handleForgotPassword}>
              <h2>Forgot Password</h2>
              <input
                placeholder="Email"
                value={reset.email}
                onChange={(e) => setReset({ ...reset, email: e.target.value })}
                disabled={isLoading('forgot')}
              />
              <button type="submit" disabled={isLoading('forgot')}>
                {isLoading('forgot') ? 'Requesting...' : 'Generate Reset Token'}
              </button>
            </form>
          )}

          {mode === 'reset' && (
            <form onSubmit={handleResetPassword}>
              <h2>Reset Password</h2>
              <input
                placeholder="Email"
                value={reset.email}
                onChange={(e) => setReset({ ...reset, email: e.target.value })}
                disabled={isLoading('reset')}
              />
              <input
                placeholder="Reset token"
                value={reset.token}
                onChange={(e) => setReset({ ...reset, token: e.target.value })}
                disabled={isLoading('reset')}
              />
              <input
                type="password"
                placeholder="New password"
                value={reset.password}
                onChange={(e) => setReset({ ...reset, password: e.target.value })}
                disabled={isLoading('reset')}
              />
              <button type="submit" disabled={isLoading('reset')}>
                {isLoading('reset') ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          )}
        </section>
      ) : (
        <section className="dashboard">
          <section>
            <div className="section-header">
              <h2>Your Notes</h2>
              <button onClick={() => loadNotes()} disabled={isLoading('notes')}>
                {isLoading('notes') ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>

            <form onSubmit={createNote}>
              <input
                placeholder="Title"
                value={note.title}
                onChange={(e) => setNote({ ...note, title: e.target.value })}
                disabled={isLoading('createNote')}
              />
              <textarea
                placeholder="Content"
                value={note.content}
                onChange={(e) => setNote({ ...note, content: e.target.value })}
                disabled={isLoading('createNote')}
              />
              <button type="submit" disabled={isLoading('createNote')}>
                {isLoading('createNote') ? 'Adding...' : 'Add Note'}
              </button>
            </form>

            <div className="list">
              {notes.length === 0 ? (
                <p className="empty">No notes yet.</p>
              ) : (
                notes.map((item) => (
                  <article key={item._id}>
                    <h3>{item.title}</h3>
                    <p>{item.content}</p>
                  </article>
                ))
              )}
            </div>
          </section>

          {user.role === 'admin' && (
            <section>
              <div className="section-header">
                <h2>Admin Dashboard</h2>
                <button onClick={() => loadAdminDashboard()} disabled={isLoading('adminRefresh')}>
                  {isLoading('adminRefresh') ? 'Refreshing...' : 'Refresh Admin Data'}
                </button>
              </div>

              <h3>Users</h3>
              <div className="list">
                {adminUsers.map((item) => (
                  <article key={item._id} className="row">
                    <div>
                      <strong>{item.name}</strong>
                      <p>{item.email}</p>
                      <p>
                        {item.role} | failed attempts: {item.failedLoginAttempts || 0} |{' '}
                        {item.isLocked ? `locked until ${new Date(item.lockUntil).toLocaleString()}` : 'not locked'}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteUser(item._id)}
                      disabled={item._id === user._id || isLoading(`deleteUser:${item._id}`)}
                    >
                      {isLoading(`deleteUser:${item._id}`) ? 'Deleting...' : 'Delete'}
                    </button>
                  </article>
                ))}
              </div>

              <h3>Audit Logs</h3>
              <div className="logs">
                {auditLogs.map((item, index) => (
                  <pre key={`${item.timestamp || 'log'}-${index}`}>{JSON.stringify(item, null, 2)}</pre>
                ))}
              </div>
            </section>
          )}
        </section>
      )}
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
