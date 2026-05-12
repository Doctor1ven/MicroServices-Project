import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

function App() {
  const [mode, setMode] = useState('login');
  const [user, setUser] = useState(null);
  const [token, setToken] = useState('');
  const [notes, setNotes] = useState([]);
  const [message, setMessage] = useState('');

  const [auth, setAuth] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user'
  });
  const [note, setNote] = useState({ title: '', content: '' });

  async function request(url, options = {}) {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });

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
          : auth;

      const data = await request(`/api/auth/${mode}`, {
        method: 'POST',
        body: JSON.stringify(body)
      });

      setUser(data.user);
      setToken(data.token);
      setMessage(data.message);
      loadNotes(data.token);
    } catch (err) {
      setMessage(err.message);
    }
  }

  async function loadNotes(loginToken = token) {
    try {
      const data = await fetch('/api/notes', {
        headers: { Authorization: `Bearer ${loginToken}` }
      }).then((res) => res.json());

      setNotes(data.notes || []);
    } catch {
      setMessage('Could not load notes');
    }
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

  async function deleteNote(id) {
    try {
      await request(`/api/notes/${id}`, { method: 'DELETE' });
      setNotes(notes.filter((item) => item._id !== id));
      setMessage('Note deleted');
    } catch (err) {
      setMessage(err.message);
    }
  }

  return (
    <main>
      <h1>Secure Notes Frontend</h1>
      {message && <p>{message}</p>}

      {!token ? (
        <form onSubmit={handleAuth}>
          <h2>{mode === 'login' ? 'Login' : 'Register'}</h2>

          <button type="button" onClick={() => setMode('login')}>Login</button>
          <button type="button" onClick={() => setMode('register')}>Register</button>

          {mode === 'register' && (
            <>
              <input
                placeholder="Name"
                value={auth.name}
                onChange={(e) => setAuth({ ...auth, name: e.target.value })}
              />
              <select
                value={auth.role}
                onChange={(e) => setAuth({ ...auth, role: e.target.value })}
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </>
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
      ) : (
        <>
          <p>
            Logged in as {user.name} ({user.role})
          </p>
          <button onClick={() => loadNotes()}>Refresh notes</button>
          <button onClick={() => setToken('')}>Logout</button>

          <form onSubmit={createNote}>
            <h2>Create Note</h2>
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

          <h2>Notes</h2>
          {notes.map((item) => (
            <div key={item._id}>
              <h3>{item.title}</h3>
              <p>{item.content}</p>
              {user.role === 'admin' && (
                <button onClick={() => deleteNote(item._id)}>Delete</button>
              )}
            </div>
          ))}
        </>
      )}
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
