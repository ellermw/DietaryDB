const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Basic middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Load middleware
let authenticateToken, authorizeRole, trackActivity;

try {
  const auth = require('./middleware/auth');
  authenticateToken = auth.authenticateToken;
  authorizeRole = auth.authorizeRole;
} catch (err) {
  console.error('Auth middleware not found, creating dummy');
  authenticateToken = (req, res, next) => next();
  authorizeRole = () => (req, res, next) => next();
}

try {
  const activity = require('./middleware/activityTracker');
  trackActivity = activity.trackActivity;
} catch (err) {
  console.error('Activity tracker not found, creating dummy');
  trackActivity = (req, res, next) => next();
}

// Load routes
try {
  const authRoutes = require('./routes/auth');
  app.use('/api/auth', authRoutes);
  console.log('Auth routes loaded');
} catch (err) {
  console.error('Failed to load auth routes:', err.message);
}

try {
  const dashboardRoutes = require('./routes/dashboard');
  app.use('/api/dashboard', authenticateToken, trackActivity, dashboardRoutes);
  console.log('Dashboard routes loaded');
} catch (err) {
  console.error('Failed to load dashboard routes:', err.message);
}

try {
  const itemRoutes = require('./routes/items');
  app.use('/api/items', authenticateToken, trackActivity, itemRoutes);

try {
  const categoryRoutes = require('./routes/categories');
  app.use('/api/categories', authenticateToken, trackActivity, categoryRoutes);
  console.log('Category routes loaded');
} catch (err) {
  console.error('Failed to load category routes:', err.message);
}
  console.log('Items routes loaded');
} catch (err) {
  console.error('Failed to load items routes:', err.message);
}

try {
  const userRoutes = require('./routes/users');
  app.use('/api/users', authenticateToken, trackActivity, userRoutes);
  console.log('Users routes loaded');
} catch (err) {
  console.error('Failed to load users routes:', err.message);
}

try {
  const tasksRoutes = require('./routes/tasks');
  app.use('/api/tasks', authenticateToken, trackActivity, tasksRoutes);
  console.log('Tasks routes loaded');
} catch (err) {
  console.error('Failed to load tasks routes:', err.message);
}

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
