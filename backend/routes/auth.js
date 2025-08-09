const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'dietary_postgres',
  port: 5432,
  database: process.env.DB_NAME || 'dietary_db',
  user: process.env.DB_USER || 'dietary_user',
  password: process.env.DB_PASSWORD || 'DietarySecurePass2024!'
});

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

// Login endpoint with comprehensive logging
router.post('/login', async (req, res) => {
  console.log('=== LOGIN ATTEMPT ===');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Body:', JSON.stringify(req.body));
  
  const { username, password } = req.body;
  
  if (!username || !password) {
    console.log('Missing credentials');
    return res.status(400).json({ message: 'Username and password are required' });
  }
  
  try {
    // First try hardcoded admin credentials for immediate testing
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
      
      console.log('Admin login successful (hardcoded)');
      
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
    
    console.log('Database query executed, rows found:', result.rows.length);
    
    if (result.rows.length === 0) {
      console.log('User not found:', username);
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    const user = result.rows[0];
    console.log('User found:', user.username, 'Active:', user.is_active);
    
    if (!user.is_active) {
      console.log('User account is inactive');
      return res.status(401).json({ message: 'Account is inactive' });
    }
    
    // Try both password_hash and password fields
    const passwordField = user.password_hash || user.password;
    
    if (!passwordField) {
      console.log('No password hash found for user');
      return res.status(500).json({ message: 'Account configuration error' });
    }
    
    // Compare password
    const validPassword = await bcrypt.compare(password, passwordField);
    console.log('Password validation result:', validPassword);
    
    if (!validPassword) {
      console.log('Invalid password for user:', username);
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        user_id: user.user_id,
        username: user.username,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    console.log('Login successful for user:', username);
    console.log('Token generated successfully');
    
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
    res.status(500).json({ message: 'Internal server error during login' });
  }
});

// Verify token endpoint
router.get('/verify', async (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ valid: false, message: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ valid: true, user: decoded });
  } catch (error) {
    res.status(401).json({ valid: false, message: 'Invalid token' });
  }
});

module.exports = router;
