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

// Debug endpoint to check what's happening
router.get('/debug', async (req, res) => {
  try {
    const result = await pool.query('SELECT username, password_hash FROM users WHERE role = $1', ['Admin']);
    const users = result.rows.map(u => ({
      username: u.username,
      hash_start: u.password_hash.substring(0, 30),
      hash_length: u.password_hash.length
    }));
    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Login endpoint with detailed logging
router.post('/login', async (req, res) => {
  console.log('=== LOGIN ATTEMPT ===');
  console.log('Body:', req.body);
  const { username, password } = req.body;
  
  if (!username || !password) {
    console.log('Missing credentials');
    return res.status(400).json({ message: 'Username and password are required' });
  }
  
  try {
    // Get user from database
    const result = await pool.query(
      'SELECT user_id, username, password_hash, first_name, last_name, role, is_active FROM users WHERE username = $1',
      [username]
    );
    
    console.log('Query result rows:', result.rows.length);
    
    if (result.rows.length === 0) {
      console.log('User not found:', username);
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    const user = result.rows[0];
    console.log('User found:', user.username);
    console.log('User active:', user.is_active);
    console.log('Hash from DB:', user.password_hash.substring(0, 30) + '...');
    console.log('Hash length:', user.password_hash.length);
    
    if (!user.is_active) {
      console.log('User inactive');
      return res.status(401).json({ message: 'Account is inactive' });
    }
    
    // Test password directly with sync method
    console.log('Testing password:', password);
    const validPassword = bcrypt.compareSync(password, user.password_hash);
    console.log('Password valid (sync):', validPassword);
    
    // Also test with async method
    bcrypt.compare(password, user.password_hash, (err, asyncResult) => {
      console.log('Password valid (async):', asyncResult);
      if (err) console.log('Async error:', err);
    });
    
    if (!validPassword) {
      // Try trimming the hash in case there are whitespace issues
      const trimmedHash = user.password_hash.trim();
      const validWithTrim = bcrypt.compareSync(password, trimmedHash);
      console.log('Valid with trimmed hash:', validWithTrim);
      
      console.log('Invalid password for:', username);
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Generate token
    const token = jwt.sign(
      {
        userId: user.user_id,
        username: user.username,
        role: user.role,
        firstName: user.first_name,
        lastName: user.last_name
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    console.log('Login successful!');
    
    res.json({
      token,
      user: {
        userId: user.user_id,
        username: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// Test endpoint
router.post('/test-bcrypt', async (req, res) => {
  const { password } = req.body;
  const hash = bcrypt.hashSync(password, 10);
  const valid = bcrypt.compareSync(password, hash);
  
  res.json({
    password,
    hash,
    valid,
    bcryptVersion: require('bcryptjs/package.json').version
  });
});

module.exports = router;
