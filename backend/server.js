const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import routes
const authRoutes = require('./routes/auth');
const itemRoutes = require('./routes/items');
const userRoutes = require('./routes/users');
const patientRoutes = require('./routes/patients');
const orderRoutes = require('./routes/orders');
const systemRoutes = require('./routes/system');
const tasksRoutes = require('./routes/tasks');

// Import middleware
const { authenticateToken } = require('./middleware/auth');
const { trackActivity } = require('./middleware/activityTracker');

// Health check (no auth required)
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Test route to verify server is working
app.get('/test', (req, res) => {
  res.json({ message: 'Server is working' });
});

// Auth routes (no activity tracking needed)
app.use('/api/auth', authRoutes);

// Protected routes with activity tracking
app.use('/api/items', authenticateToken, trackActivity, itemRoutes);
app.use('/api/users', authenticateToken, trackActivity, userRoutes);
app.use('/api/patients', authenticateToken, trackActivity, patientRoutes);
app.use('/api/orders', authenticateToken, trackActivity, orderRoutes);
app.use('/api/system', authenticateToken, trackActivity, systemRoutes);
app.use('/api/tasks', authenticateToken, trackActivity, tasksRoutes);

// Log all registered routes (for debugging)
console.log('Registered routes:');
app._router.stack.forEach(function(r){
  if (r.route && r.route.path){
    console.log(r.route.path)
  } else if (r.name === 'router' && r.regexp) {
    console.log('Router:', r.regexp.source.replace('^\\', '').replace('\\/?(?=\\/|$)', ''));
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// 404 handler
app.use((req, res) => {
  console.log('404 Not Found:', req.method, req.path);
  res.status(404).json({ message: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Tasks routes should be available at /api/tasks/*');
});

module.exports = app;
