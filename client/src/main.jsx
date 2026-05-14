import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const API_BASE_URL = (process.env.REACT_APP_API_URL || '').replace(/\/$/, '');
const apiUrl = (path) => `${API_BASE_URL}${path}`;

function App() {
  const [mode, setMode] = useState('login');
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState('');
  const [refreshToken, setRefreshToken] = useState('');
  const [notes, setNotes] = useState([]);
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminNotes, setAdminNotes] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [message, setMessage] = useState('');

  const [auth, setAuth] = useState({ name: '', email: '', password: '' });
  const [reset, setReset] = useState({ email: '', token: '', password: '' });
  const [note, setNote] = useState({ title: '', content: '' });

  async function refreshAccessToken() {
    if (!refreshToken) throw new Error('Session expired');

    const res = await fetch(apiUrl('/api/auth/refresh'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });
    const data = await res.json();

    if (!res.ok) throw new Error(data.message || 'Session expired');

    setAccessToken(data.accessToken);
    return data.accessToken;
  }

  async function request(url, options = {}, retry = true) {
    const res = await fetch(apiUrl(url), {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...options.headers
      }
    });

    if (res.status === 401 && retry && refreshToken) {
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
        false
      );
    }

    const data = res.status === 204 ? {} : await res.json();
    if (!res.ok) throw new Error(data.message || 'Request failed');
    return data;
  }

  async function handleAuth(e) {
    e.preventDefault();
    try {
      const body =
        mode === 'login'
          ? { email: auth.email, password: auth.password }
          : { name: auth.name, email: auth.email, password: auth.password };

      const data = await request(`/api/auth/${mode}`, {
        method: 'POST',
        body: JSON.stringify(body)
      });

      setUser(data.user);
      setAccessToken(data.accessToken);
      setRefreshToken(data.refreshToken);
      setMessage(data.message);
      await loadNotes(data.accessToken);

      if (data.user.role === 'admin') {
        await loadAdminDashboard(data.accessToken);
      }
    } catch (err) {
      setMessage(err.message);
    }
  }

  async function handleForgotPassword(e) {
    e.preventDefault();
    try {
      const data = await request('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: reset.email })
      });
      setMessage(data.message);
    } catch (err) {
      setMessage(err.message);
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    try {
      const data = await request('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify(reset)
      });
      setMessage(data.message);
      setMode('login');
    } catch (err) {
      setMessage(err.message);
    }
  }

  async function loadNotes(token = accessToken) {
    const data = await request('/api/notes', {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    setNotes(data.notes || []);
  }

  async function loadAdminDashboard(token = accessToken) {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const [usersData, notesData, logsData] = await Promise.all([
      request('/api/admin/users', { headers }),
      request('/api/admin/notes', { headers }),
      request('/api/admin/logs', { headers })
    ]);

    setAdminUsers(usersData.users || []);
    setAdminNotes(notesData.notes || []);
    setAuditLogs(logsData.logs || []);
  }

  async function createNote(e) {
    e.preventDefault();
    try {
      const data = await request('/api/notes', {
        method: 'POST',
        body: JSON.stringify(note)
      });

      setNotes([data.note, ...notes]);
      setNote({ title: '', content: '' });
      setMessage(data.message);
    } catch (err) {
      setMessage(err.message);
    }
  }

  async function deleteUser(id) {
    try {
      await request(`/api/admin/users/${id}`, { method: 'DELETE' });
      setAdminUsers(adminUsers.filter((item) => item._id !== id));
      setAdminNotes(adminNotes.filter((item) => item.owner?._id !== id && item.owner !== id));
      setMessage('User deleted');
      await loadAdminDashboard();
    } catch (err) {
      setMessage(err.message);
    }
  }

  async function logout() {
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
    setAdminNotes([]);
    setAuditLogs([]);
    setMessage('Logged out');
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
            <button onClick={logout}>Logout</button>
          </div>
        )}
      </header>

      {message && <p className="message">{message}</p>}

      {!accessToken ? (
        <section>
          <div className="tabs">
            <button type="button" onClick={() => setMode('login')}>Login</button>
            <button type="button" onClick={() => setMode('register')}>Register</button>
            <button type="button" onClick={() => setMode('forgot')}>Forgot Password</button>
            <button type="button" onClick={() => setMode('reset')}>Reset Password</button>
          </div>

          {(mode === 'login' || mode === 'register') && (
            <form onSubmit={handleAuth}>
              <h2>{mode === 'login' ? 'Login' : 'Register'}</h2>
              {mode === 'register' && (
                <input
                  placeholder="Name"
                  value={auth.name}
                  onChange={(e) => setAuth({ ...auth, name: e.target.value })}
                />
              )}
              <input
                placeholder="Email"
                value={auth.email}
                onChange={(e) => setAuth({ ...auth, email: e.target.value })}
              />
              <input
                type="password"
                placeholder="Password"
                value={auth.password}
                onChange={(e) => setAuth({ ...auth, password: e.target.value })}
              />
              <button type="submit">Submit</button>
            </form>
          )}

          {mode === 'forgot' && (
            <form onSubmit={handleForgotPassword}>
              <h2>Forgot Password</h2>
              <input
                placeholder="Email"
                value={reset.email}
                onChange={(e) => setReset({ ...reset, email: e.target.value })}
              />
              <button type="submit">Generate Reset Token</button>
            </form>
          )}

          {mode === 'reset' && (
            <form onSubmit={handleResetPassword}>
              <h2>Reset Password</h2>
              <input
                placeholder="Email"
                value={reset.email}
                onChange={(e) => setReset({ ...reset, email: e.target.value })}
              />
              <input
                placeholder="Reset token"
                value={reset.token}
                onChange={(e) => setReset({ ...reset, token: e.target.value })}
              />
              <input
                type="password"
                placeholder="New password"
                value={reset.password}
                onChange={(e) => setReset({ ...reset, password: e.target.value })}
              />
              <button type="submit">Reset Password</button>
            </form>
          )}
        </section>
      ) : (
        <section className="dashboard">
          <section>
            <div className="section-header">
              <h2>Your Notes</h2>
              <button onClick={() => loadNotes()}>Refresh</button>
            </div>

            <form onSubmit={createNote}>
              <input
                placeholder="Title"
                value={note.title}
                onChange={(e) => setNote({ ...note, title: e.target.value })}
              />
              <textarea
                placeholder="Content"
                value={note.content}
                onChange={(e) => setNote({ ...note, content: e.target.value })}
              />
              <button type="submit">Add Note</button>
            </form>

            <div className="list">
              {notes.map((item) => (
                <article key={item._id}>
                  <h3>{item.title}</h3>
                  <p>{item.content}</p>
                </article>
              ))}
            </div>
          </section>

          {user.role === 'admin' && (
            <section>
              <div className="section-header">
                <h2>Admin Dashboard</h2>
                <button onClick={() => loadAdminDashboard()}>Refresh Admin Data</button>
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
                    <button onClick={() => deleteUser(item._id)} disabled={item._id === user._id}>
                      Delete
                    </button>
                  </article>
                ))}
              </div>

              <h3>All Notes</h3>
              <div className="list">
                {adminNotes.map((item) => (
                  <article key={item._id}>
                    <h4>{item.title}</h4>
                    <p>{item.content}</p>
                    <small>
                      Owner: {item.owner?.email || item.owner}
                    </small>
                  </article>
                ))}
              </div>

              <h3>Audit Logs</h3>
              <div className="logs">
                {auditLogs.map((item, index) => (
                  <pre key={`${item.timestamp || 'log'}-${index}`}>
                    {JSON.stringify(item, null, 2)}
                  </pre>
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
