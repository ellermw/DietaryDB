const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'postgres',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'dietary_db',
  user: process.env.DB_USER || 'dietary_user',
  password: process.env.DB_PASSWORD,
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ 
        error: 'Username and password are required' 
      });
    }
    
    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1 AND is_active = true',
      [username]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ 
        error: 'Invalid credentials' 
      });
    }
    
    const user = result.rows[0];
    const isValid = await bcrypt.compare(password, user.password);
    
    if (!isValid) {
      return res.status(401).json({ 
        error: 'Invalid credentials' 
      });
    }
    
    await pool.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE user_id = $1',
      [user.user_id]
    );
    
    const token = jwt.sign(
      {
        user_id: user.user_id,
        username: user.username,
        role: user.role,
        full_name: user.full_name
      },
      process.env.JWT_SECRET || 'your-secret-jwt-key-change-this-in-production',
      { expiresIn: '24h' }
    );
    
    res.json({
      token,
      user: {
        user_id: user.user_id,
        username: user.username,
        full_name: user.full_name,
        role: user.role,
        must_change_password: user.must_change_password
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      error: 'Login failed' 
    });
  }
});

router.get('/verify', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'No token provided' 
      });
    }
    
    const token = authHeader.substring(7);
    
    const decoded = jwt.verify(
      token, 
      process.env.JWT_SECRET || 'your-secret-jwt-key-change-this-in-production'
    );
    
    const result = await pool.query(
      'SELECT user_id, username, full_name, role, must_change_password FROM users WHERE user_id = $1 AND is_active = true',
      [decoded.user_id]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ 
        error: 'User not found' 
      });
    }
    
    res.json({
      valid: true,
      user: result.rows[0]
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired' 
      });
    }
    
    res.status(401).json({ 
      error: 'Invalid token' 
    });
  }
});

router.post('/change-password', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Authentication required' 
      });
    }
    
    const token = authHeader.substring(7);
    const decoded = jwt.verify(
      token, 
      process.env.JWT_SECRET || 'your-secret-jwt-key-change-this-in-production'
    );
    
    const { current_password, new_password } = req.body;
    
    if (!current_password || !new_password) {
      return res.status(400).json({ 
        error: 'Current and new passwords are required' 
      });
    }
    
    const userResult = await pool.query(
      'SELECT * FROM users WHERE user_id = $1',
      [decoded.user_id]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ 
        error: 'User not found' 
      });
    }
    
    const user = userResult.rows[0];
    const isValid = await bcrypt.compare(current_password, user.password);
    
    if (!isValid) {
      return res.status(401).json({ 
        error: 'Current password is incorrect' 
      });
    }
    
    const hashedPassword = await bcrypt.hash(new_password, 10);
    
    await pool.query(
      'UPDATE users SET password = $1, must_change_password = false WHERE user_id = $2',
      [hashedPassword, decoded.user_id]
    );
    
    res.json({ 
      message: 'Password changed successfully' 
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ 
      error: 'Failed to change password' 
    });
  }
});

router.post('/logout', (req, res) => {
  res.json({ 
    message: 'Logged out successfully' 
  });
});

module.exports = router;
