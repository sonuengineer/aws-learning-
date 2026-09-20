import { useEffect, useState } from 'react';
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
});

const statusOptions = ['TODO', 'IN_PROGRESS', 'DONE'];

const statusConfig = {
  TODO: { label: 'To Do' },
  IN_PROGRESS: { label: 'In Progress' },
  DONE: { label: 'Done' },
};

function App() {
  const [token, setToken] = useState(localStorage.getItem('taskflow_token') || '');
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('taskflow_user') || 'null'));
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loginForm, setLoginForm] = useState({ username: 'admin', password: 'admin123' });
  const [taskForm, setTaskForm] = useState({ title: '', description: '', status: 'TODO' });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    if (token) {
      fetchTasks();
    }
  }, [token]);

  async function fetchTasks() {
    if (!token) return;

    setLoading(true);
    setError('');

    try {
      const response = await api.get('/tasks', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTasks(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load tasks');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(event) {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/login', loginForm);
      const { token: newToken, user: userData } = response.data;

      localStorage.setItem('taskflow_token', newToken);
      localStorage.setItem('taskflow_user', JSON.stringify(userData));
      setToken(newToken);
      setUser(userData);
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleTaskSubmit(event) {
    event.preventDefault();

    if (!taskForm.title.trim()) {
      setError('Title is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (editingId) {
        await api.put(`/tasks/${editingId}`, taskForm, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await api.post('/tasks', taskForm, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      setTaskForm({ title: '', description: '', status: 'TODO' });
      setEditingId(null);
      fetchTasks();
    } catch (err) {
      setError(err.response?.data?.message || 'Task operation failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteTask(taskId) {
    try {
      await api.delete(`/tasks/${taskId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchTasks();
    } catch (err) {
      setError(err.response?.data?.message || 'Delete failed');
    }
  }

  function handleEditTask(task) {
    setEditingId(task.id);
    setTaskForm({
      title: task.title,
      description: task.description || '',
      status: task.status,
    });
  }

  function handleLogout() {
    localStorage.removeItem('taskflow_token');
    localStorage.removeItem('taskflow_user');
    setToken('');
    setUser(null);
    setTasks([]);
    setTaskForm({ title: '', description: '', status: 'TODO' });
    setEditingId(null);
  }

  if (!token || !user) {
    return (
      <div className="page-shell">
        <div className="card login-card">
          <div className="brand">
            <div className="brand-mark">TF</div>
            <div>
              <h1>TaskFlow</h1>
              <p className="eyebrow">Organize. Track. Deliver.</p>
            </div>
          </div>

          <p className="login-subtitle">Sign in to manage your work</p>

          <form onSubmit={handleLogin} className="stack">
            <label>
              Username
              <input
                type="text"
                value={loginForm.username}
                onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                placeholder="admin"
                autoFocus
              />
            </label>

            <label>
              Password
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                placeholder="admin123"
              />
            </label>

            {error && <div className="error-box">{error}</div>}

            <button type="submit" disabled={loading}>
              {loading ? 'Signing in...' : 'Login'}
            </button>

            <p className="hint">Demo credentials: admin / admin123</p>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell dashboard-shell">
      <aside className="sidebar card">
        <div>
          <p className="eyebrow">Logged in as</p>
          <h2>{user.username}</h2>
          <p className="user-role">Ready to work</p>
        </div>

        <button className="secondary" onClick={handleLogout}>
          Logout
        </button>
      </aside>

      <main className="content">
        <div className="card form-card">
          <h3>{editingId ? 'Update task' : 'Create task'}</h3>

          <form onSubmit={handleTaskSubmit} className="stack">
            <label>
              Title
              <input
                type="text"
                value={taskForm.title}
                onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                placeholder="Task title"
              />
            </label>

            <label>
              Description
              <textarea
                rows="3"
                value={taskForm.description}
                onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                placeholder="Details"
              />
            </label>

            <label>
              Status
              <select
                value={taskForm.status}
                onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value })}
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {statusConfig[status].label}
                  </option>
                ))}
              </select>
            </label>

            {error && <div className="error-box">{error}</div>}

            <div className="action-row">
              <button type="submit" disabled={loading}>
                {loading ? 'Saving...' : editingId ? 'Update task' : 'Add task'}
              </button>

              {editingId && (
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    setEditingId(null);
                    setTaskForm({ title: '', description: '', status: 'TODO' });
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="card list-card">
          <div className="list-header">
            <h3>Tasks</h3>
            <span className="task-count">{tasks.length} total</span>
          </div>

          {loading && tasks.length === 0 ? (
            <p className="empty-state">Loading tasks...</p>
          ) : tasks.length === 0 ? (
            <p className="empty-state">No tasks yet. Add your first one.</p>
          ) : (
            <div className="task-list">
              {tasks.map((task) => (
                <article key={task.id} className="task-item">
                  <div className="task-topline">
                    <h4>{task.title}</h4>
                    <span className={`status-badge ${task.status}`}>
                      {statusConfig[task.status].label}
                    </span>
                  </div>

                  <p>{task.description || 'No description provided.'}</p>

                  <div className="task-actions">
                    <button type="button" className="secondary" onClick={() => handleEditTask(task)}>
                      Edit
                    </button>
                    <button type="button" className="danger" onClick={() => handleDeleteTask(task.id)}>
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;