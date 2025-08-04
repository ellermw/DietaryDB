const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Basic middleware
app.use(cors());
app.use(express.json());

// Logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// Test route
app.get('/test', (req, res) => {
  res.json({ message: 'Server is working' });
});

// Load routes with error handling
try {
  const authRoutes = require('./routes/auth');
  app.use('/api/auth', authRoutes);
  console.log('Auth routes loaded');
} catch (err) {
  console.error('Failed to load auth routes:', err.message);
}

try {
  const dashboardRoutes = require('./routes/dashboard');
  app.use('/api/dashboard', dashboardRoutes);
  console.log('Dashboard routes loaded');
} catch (err) {
  console.error('Failed to load dashboard routes:', err.message);
}

try {
  const usersRoutes = require('./routes/users');
  app.use('/api/users', usersRoutes);
  console.log('Users routes loaded');
} catch (err) {
  console.error('Failed to load users routes:', err.message);
}

try {
  const itemsRoutes = require('./routes/items');
  app.use('/api/items', itemsRoutes);
  console.log('Items routes loaded');
} catch (err) {
  console.error('Failed to load items routes:', err.message);
}

try {
  const tasksRoutes = require('./routes/tasks');
  app.use('/api/tasks', tasksRoutes);
  console.log('Tasks routes loaded');
} catch (err) {
  console.error('Failed to load tasks routes:', err.message);
}

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ message: err.message });
});

// 404 handler
app.use((req, res) => {
  console.log('404:', req.path);
  res.status(404).json({ message: 'Route not found' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
