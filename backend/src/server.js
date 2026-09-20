const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('./db');
require('dotenv').config();

const app = express();
const port = Number(process.env.PORT) || 5000;
const jwtSecret = process.env.JWT_SECRET || 'dev-secret';

const validStatuses = ['TODO', 'IN_PROGRESS', 'DONE'];

function normalizeStatus(status) {
  return validStatuses.includes(status) ? status : 'TODO';
}

async function initializeDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(150) NOT NULL,
        description TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'TODO' CHECK (status IN ('TODO', 'IN_PROGRESS', 'DONE')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    const defaultUsername = process.env.DEFAULT_USERNAME || 'admin';
    const defaultPassword = process.env.DEFAULT_PASSWORD || 'admin123';

    const existingUser = await pool.query('SELECT id FROM users WHERE username = $1', [defaultUsername]);

    if (!existingUser.rows.length) {
      const passwordHash = await bcrypt.hash(defaultPassword, 10);
      await pool.query('INSERT INTO users (username, password_hash) VALUES ($1, $2)', [
        defaultUsername,
        passwordHash,
      ]);
    }

    console.log('Database tables initialized');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, jwtSecret);
    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

app.use(cors());
app.use(express.json());

app.get('/api/health', async (_req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');

    res.json({
      success: true,
      message: 'API + AWS RDS working',
      databaseTime: result.rows[0].now,
    });
  } catch (error) {
    console.error('Health check error:', error);

    res.status(500).json({
      success: false,
      message: 'Database connection failed',
    });
  }
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = result.rows[0];

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const token = jwt.sign({ userId: user.id, username: user.username }, jwtSecret, { expiresIn: '1h' });

    return res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Login failed' });
  }
});

app.get('/api/tasks', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM tasks WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Tasks fetch error:', error);
    res.status(500).json({ message: 'Unable to fetch tasks' });
  }
});

app.post('/api/tasks', authMiddleware, async (req, res) => {
  const { title, description, status } = req.body;

  if (!title || !String(title).trim()) {
    return res.status(400).json({ message: 'Title is required' });
  }

  const safeStatus = normalizeStatus(status);

  try {
    const result = await pool.query(
      'INSERT INTO tasks (user_id, title, description, status) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.user.userId, title.trim(), description || '', safeStatus]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Task create error:', error);
    res.status(500).json({ message: 'Unable to create task' });
  }
});

app.put('/api/tasks/:id', authMiddleware, async (req, res) => {
  const { title, description, status } = req.body;
  const taskId = Number(req.params.id);

  if (!Number.isInteger(taskId)) {
    return res.status(400).json({ message: 'Invalid task id' });
  }

  try {
    const taskCheck = await pool.query(
      'SELECT * FROM tasks WHERE id = $1 AND user_id = $2',
      [taskId, req.user.userId]
    );

    if (!taskCheck.rows.length) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const updatedTitle = title !== undefined ? String(title).trim() : taskCheck.rows[0].title;
    const updatedDescription = description !== undefined ? description : taskCheck.rows[0].description;
    const updatedStatus = status !== undefined ? normalizeStatus(status) : taskCheck.rows[0].status;

    const result = await pool.query(
      `UPDATE tasks
       SET title = $1, description = $2, status = $3, updated_at = NOW()
       WHERE id = $4 AND user_id = $5
       RETURNING *`,
      [updatedTitle, updatedDescription, updatedStatus, taskId, req.user.userId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Task update error:', error);
    res.status(500).json({ message: 'Unable to update task' });
  }
});

app.delete('/api/tasks/:id', authMiddleware, async (req, res) => {
  const taskId = Number(req.params.id);

  if (!Number.isInteger(taskId)) {
    return res.status(400).json({ message: 'Invalid task id' });
  }

  try {
    const result = await pool.query(
      'DELETE FROM tasks WHERE id = $1 AND user_id = $2 RETURNING *',
      [taskId, req.user.userId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: 'Task not found' });
    }

    res.json({ message: 'Task deleted' });
  } catch (error) {
    console.error('Task delete error:', error);
    res.status(500).json({ message: 'Unable to delete task' });
  }
});

initializeDatabase()
  .then(() => {
    app.listen(port, () => {
      console.log(`TaskFlow backend running on port ${port}`);
    });
  })
  .catch((error) => {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  });
