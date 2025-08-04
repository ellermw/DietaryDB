const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Basic middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// API routes
try {
  app.use('/api/auth', require('./routes/auth'));
  console.log('✓ Auth routes loaded');
} catch (err) {
  console.error('✗ Auth routes failed:', err.message);
}

try {
  app.use('/api/dashboard', require('./routes/dashboard'));
  console.log('✓ Dashboard routes loaded');
} catch (err) {
  console.error('✗ Dashboard routes failed:', err.message);
}

try {
  app.use('/api/users', require('./routes/users'));
  console.log('✓ Users routes loaded');
} catch (err) {
  console.error('✗ Users routes failed:', err.message);
}

try {
  app.use('/api/items', require('./routes/items'));
  console.log('✓ Items routes loaded');
} catch (err) {
  console.error('✗ Items routes failed:', err.message);
}

try {
  app.use('/api/tasks', require('./routes/tasks'));
  console.log('✓ Tasks routes loaded');
} catch (err) {
  console.error('✗ Tasks routes failed:', err.message);
}

// 404 handler
app.use((req, res) => {
  console.log('404 Not Found:', req.method, req.path);
  res.status(404).json({ message: 'Route not found' });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Environment:', process.env.NODE_ENV || 'development');
});

module.exports = app;
