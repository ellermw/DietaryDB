const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Import middleware
const { authenticateToken } = require('./middleware/auth');

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/dashboard', authenticateToken, require('./routes/dashboard'));
app.use('/api/items', authenticateToken, require('./routes/items'));
app.use('/api/users', authenticateToken, require('./routes/users'));

// Check if routes exist before requiring them
const fs = require('fs');

if (fs.existsSync('./routes/categories.js')) {
  app.use('/api/categories', authenticateToken, require('./routes/categories'));
} else {
  console.log('Categories route not found, skipping...');
}

if (fs.existsSync('./routes/tasks.js')) {
  app.use('/api/tasks', authenticateToken, require('./routes/tasks'));
} else {
  console.log('Tasks route not found, skipping...');
}

if (fs.existsSync('./routes/logs.js')) {
  app.use('/api/logs', authenticateToken, require('./routes/logs'));
} else {
  console.log('Logs route not found, skipping...');
}

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// 404 handler
app.use((req, res) => {
  console.log(`404: ${req.method} ${req.url}`);
  res.status(404).json({ message: `Route not found: ${req.method} ${req.url}` });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Available routes:');
  console.log('  - /api/auth');
  console.log('  - /api/dashboard');
  console.log('  - /api/items');
  console.log('  - /api/users');
  if (fs.existsSync('./routes/categories.js')) console.log('  - /api/categories');
  if (fs.existsSync('./routes/tasks.js')) console.log('  - /api/tasks');
  if (fs.existsSync('./routes/logs.js')) console.log('  - /api/logs');
});

module.exports = app;
