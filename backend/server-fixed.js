const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// IMPORTANT: Configure CORS properly
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    
    // Allow any origin in development
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    // In production, you might want to whitelist specific origins
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:8080',
      'http://15.204.252.189:3000',
      'http://15.204.252.189:3001'
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

// Also add headers manually for extra compatibility
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

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
  console.log('Items routes loaded');
} catch (err) {
  console.error('Failed to load items routes:', err.message);
}

try {
  const categoryRoutes = require('./routes/categories');
  app.use('/api/categories', authenticateToken, trackActivity, categoryRoutes);
  console.log('Category routes loaded');
} catch (err) {
  console.error('Failed to load category routes:', err.message);
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
  console.log('404 Not Found:', req.method, req.url);
  res.status(404).json({ message: 'Route not found' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log('CORS enabled for all origins in development mode');
});

module.exports = app;
