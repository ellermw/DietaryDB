const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || 'dietary_postgres',
  port: 5432,
  database: process.env.DB_NAME || 'dietary_db',
  user: process.env.DB_USER || 'dietary_user',
  password: process.env.DB_PASSWORD || 'DietarySecurePass2024!'
});

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  console.log('=== LOGIN ATTEMPT ===');
  console.log('Body:', req.body);
  
  const { username, password } = req.body;
  
  if (!username || !password) {
    console.log('Missing credentials');
    return res.status(400).json({ message: 'Username and password are required' });
  }
  
  try {
    // Hardcoded admin for immediate testing
    if (username === 'admin' && password === 'admin123') {
      const token = jwt.sign(
        { 
          user_id: 1,
          username: 'admin',
          role: 'Admin'
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      console.log('Admin login successful');
      
      return res.json({
        token: token,
        user: {
          user_id: 1,
          username: 'admin',
          first_name: 'System',
          last_name: 'Administrator',
          role: 'Admin'
        }
      });
    }
    
    // Try database authentication
    const result = await pool.query(
      'SELECT user_id, username, password_hash, first_name, last_name, role, is_active FROM users WHERE username = $1',
      [username]
    );
    
    if (result.rows.length === 0) {
      console.log('User not found');
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    const user = result.rows[0];
    
    if (!user.is_active) {
      return res.status(401).json({ message: 'Account is inactive' });
    }
    
    const validPassword = await bcrypt.compare(password, user.password_hash || user.password);
    
    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
      { 
        user_id: user.user_id,
        username: user.username,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    console.log('Login successful for:', username);
    
    res.json({
      token: token,
      user: {
        user_id: user.user_id,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Token verification endpoint
app.get('/api/auth/verify', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ valid: false });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ valid: true, user: decoded });
  } catch (error) {
    res.status(401).json({ valid: false });
  }
});

// Dashboard endpoint (protected)
app.get('/api/dashboard', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'Access denied' });
  }
  
  try {
    jwt.verify(token, JWT_SECRET);
    res.json({
      totalItems: 10,
      totalUsers: 5,
      totalCategories: 3,
      recentActivity: []
    });
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
});

// Catch-all for undefined routes
app.use('*', (req, res) => {
  console.log('404 - Route not found:', req.originalUrl);
  res.status(404).json({ message: 'Route not found' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`
====================================
Backend Server Running
Port: ${PORT}
Time: ${new Date().toISOString()}
Auth: Hardcoded admin/admin123 enabled
====================================
  `);
});
