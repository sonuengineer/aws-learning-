const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createInMemoryTaskRepository } = require('./repositories/inMemoryTaskRepository');
require('dotenv').config();

const app = express();
const port = Number(process.env.PORT) || 5000;
const jwtSecret = process.env.JWT_SECRET || 'dev-secret';
const taskRepository = createInMemoryTaskRepository();

const validStatuses = ['TODO', 'IN_PROGRESS', 'DONE'];

const users = [];

function generateUserId() {
  return users.length ? Math.max(...users.map((user) => user.id)) + 1 : 1;
}

function normalizeStatus(status) {
  return validStatuses.includes(status) ? status : 'TODO';
}

async function seedDefaultUser() {
  const username = process.env.DEFAULT_USERNAME || 'admin';
  const password = process.env.DEFAULT_PASSWORD || 'admin123';

  if (!users.some((user) => user.username === username)) {
    const passwordHash = await bcrypt.hash(password, 10);
    users.push({
      id: generateUserId(),
      username,
      password_hash: passwordHash,
    });
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

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    message: 'TaskFlow backend is running',
    database: 'in-memory',
  });
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  const user = users.find((item) => item.username === username);

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
});

app.get('/api/tasks', authMiddleware, async (req, res) => {
  const userTasks = await taskRepository.listForUser(req.user.userId);

  res.json(userTasks);
});

app.post('/api/tasks', authMiddleware, async (req, res) => {
  const { title, description, status } = req.body;

  if (!title || !String(title).trim()) {
    return res.status(400).json({ message: 'Title is required' });
  }

  const task = await taskRepository.create({
    userId: req.user.userId,
    title: String(title).trim(),
    description: description || '',
    status: normalizeStatus(status),
  });

  res.status(201).json(task);
});

app.put('/api/tasks/:id', authMiddleware, async (req, res) => {
  const taskId = Number(req.params.id);
  const { title, description, status } = req.body;

  if (!Number.isInteger(taskId)) {
    return res.status(400).json({ message: 'Invalid task id' });
  }

  const task = await taskRepository.update(taskId, req.user.userId, {
    title: title !== undefined ? String(title).trim() : undefined,
    description: description !== undefined ? description : undefined,
    status: status !== undefined ? normalizeStatus(status) : undefined,
  });

  if (!task) {
    return res.status(404).json({ message: 'Task not found' });
  }

  res.json(task);
});

app.delete('/api/tasks/:id', authMiddleware, async (req, res) => {
  const taskId = Number(req.params.id);

  if (!Number.isInteger(taskId)) {
    return res.status(400).json({ message: 'Invalid task id' });
  }

  const deleted = await taskRepository.remove(taskId, req.user.userId);

  if (!deleted) {
    return res.status(404).json({ message: 'Task not found' });
  }

  res.json({ message: 'Task deleted' });
});

seedDefaultUser()
  .then(() => {
    app.listen(port, () => {
      console.log(`TaskFlow backend running on port ${port}`);
    });
  })
  .catch((error) => {
    console.error('Failed to initialize backend:', error);
    process.exit(1);
  });
