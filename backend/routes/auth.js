const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

const router = express.Router();

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }
    
    // Get user from database
    const result = await db.query(
      'SELECT user_id, username, password, first_name, last_name, role, is_active FROM users WHERE username = $1',
      [username]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    const user = result.rows[0];
    
    // Check if user is active
    if (!user.is_active) {
      return res.status(401).json({ message: 'Account is disabled' });
    }
    
    // Verify password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        user_id: user.user_id, 
        username: user.username, 
        role: user.role 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );
    
    // Return user data without password
    delete user.password;
    
    res.json({
      token,
      user
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Error during login', error: error.message });
  }
});

// Logout (optional - mainly for frontend to clear token)
router.post('/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

// Verify token
router.get('/verify', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // Get fresh user data
    const result = await db.query(
      'SELECT user_id, username, first_name, last_name, role, is_active FROM users WHERE user_id = $1',
      [decoded.user_id]
    );
    
    if (result.rows.length === 0 || !result.rows[0].is_active) {
      return res.status(401).json({ message: 'Invalid user' });
    }
    
    res.json({ user: result.rows[0] });
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
});

module.exports = router;
