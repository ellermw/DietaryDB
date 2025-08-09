const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configure CORS properly
const corsOptions = {
  origin: true, // Allow all origins in development
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Handle preflight

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Load middleware safely
let authenticateToken, authorizeRole, trackActivity;

try {
  const auth = require('./middleware/auth');
  authenticateToken = auth.authenticateToken;
  authorizeRole = auth.authorizeRole;
} catch (err) {
  console.error('Auth middleware not found, using passthrough');
  authenticateToken = (req, res, next) => next();
  authorizeRole = () => (req, res, next) => next();
}

try {
  const activity = require('./middleware/activityTracker');
  trackActivity = activity.trackActivity;
} catch (err) {
  console.error('Activity tracker not found, using passthrough');
  trackActivity = (req, res, next) => next();
}

// Load routes safely
const routes = [
  { path: '/api/auth', file: './routes/auth', protected: false },
  { path: '/api/dashboard', file: './routes/dashboard', protected: true },
  { path: '/api/items', file: './routes/items', protected: true },
  { path: '/api/users', file: './routes/users', protected: true },
  { path: '/api/patients', file: './routes/patients', protected: true },
  { path: '/api/orders', file: './routes/orders', protected: true },
  { path: '/api/tasks', file: './routes/tasks', protected: true },
  { path: '/api/system', file: './routes/system', protected: true }
];

routes.forEach(route => {
  try {
    const router = require(route.file);
    if (route.protected) {
      app.use(route.path, authenticateToken, trackActivity, router);
    } else {
      app.use(route.path, router);
    }
    console.log(`Loaded route: ${route.path}`);
  } catch (err) {
    console.error(`Failed to load route ${route.path}:`, err.message);
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
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
  console.log('CORS enabled for all origins');
});

module.exports = app;
