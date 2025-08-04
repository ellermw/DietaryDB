// /opt/dietarydb/backend/routes/users.js
const express = require('express');
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { getActiveUsers } = require('../middleware/activityTracker');

const router = express.Router();

// Get all users with online status
router.get('/', [
  authenticateToken,
  authorizeRole('Admin')
], async (req, res) => {
  try {
    // Get all users
    const result = await db.query(
      `SELECT user_id, username, full_name, role, is_active, 
              created_date, last_login, last_activity, modified_date
       FROM users 
       ORDER BY full_name`
    );
    
    // Get currently active users
    const activeUsers = await getActiveUsers();
    const activeUserIds = new Set(activeUsers.map(u => u.user_id));
    
    // Add online status to each user
    const usersWithStatus = result.rows.map(user => ({
      ...user,
      is_online: activeUserIds.has(user.user_id),
      last_login_display: user.is_online ? 'Active' : 
                         (user.last_login ? new Date(user.last_login).toISOString() : 'Never')
    }));
    
    res.json(usersWithStatus);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Error fetching users' });
  }
});

// Get single user
router.get('/:id', [
  authenticateToken,
  authorizeRole('Admin')
], async (req, res) => {
  try {
    const result = await db.query(
      'SELECT user_id, username, full_name, role, is_active, created_date, last_login, last_activity, modified_date FROM users WHERE user_id = $1',
      [req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const user = result.rows[0];
    const activeUsers = await getActiveUsers();
    const isOnline = activeUsers.some(u => u.user_id === user.user_id);
    
    res.json({
      ...user,
      is_online: isOnline,
      last_login_display: isOnline ? 'Active' : 
                         (user.last_login ? new Date(user.last_login).toISOString() : 'Never')
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Error fetching user' });
  }
});

// Create new user
router.post('/', [
  authenticateToken,
  authorizeRole('Admin'),
  body('username').notEmpty().trim().isLength({ min: 3 }),
  body('password').isLength({ min: 6 }),
  body('full_name').notEmpty().trim(),
  body('role').isIn(['Admin', 'Kitchen', 'Nurse', 'User'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password, full_name, role } = req.body;
    
    // Check if username exists
    const existingUser = await db.query(
      'SELECT user_id FROM users WHERE username = $1',
      [username]
    );
    
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: 'Username already exists' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const result = await db.query(
      `INSERT INTO users (username, password, full_name, role, must_change_password) 
       VALUES ($1, $2, $3, $4, true) 
       RETURNING user_id, username, full_name, role, is_active, created_date`,
      [username, hashedPassword, full_name, role]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'Error creating user' });
  }
});

// Update user
router.put('/:id', [
  authenticateToken,
  authorizeRole('Admin')
], async (req, res) => {
  try {
    const userId = req.params.id;
    const { full_name, role, is_active } = req.body;
    
    const result = await db.query(
      `UPDATE users 
       SET full_name = COALESCE($1, full_name),
           role = COALESCE($2, role),
           is_active = COALESCE($3, is_active),
           modified_date = CURRENT_TIMESTAMP
       WHERE user_id = $4 
       RETURNING user_id, username, full_name, role, is_active`,
      [full_name, role, is_active, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Error updating user' });
  }
});

// Reset user password
router.post('/:id/reset-password', [
  authenticateToken,
  authorizeRole('Admin')
], async (req, res) => {
  try {
    const userId = req.params.id;
    const tempPassword = 'Temp123!';
    const hashedPassword = await bcrypt.hash(tempPassword, 10);
    
    const result = await db.query(
      `UPDATE users 
       SET password = $1, must_change_password = true, modified_date = CURRENT_TIMESTAMP 
       WHERE user_id = $2 
       RETURNING username`,
      [hashedPassword, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({ 
      message: 'Password reset successfully', 
      username: result.rows[0].username,
      temporaryPassword: tempPassword 
    });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ message: 'Error resetting password' });
  }
});

// Delete user (soft delete)
router.delete('/:id', [
  authenticateToken,
  authorizeRole('Admin')
], async (req, res) => {
  try {
    const result = await db.query(
      'UPDATE users SET is_active = false, modified_date = CURRENT_TIMESTAMP WHERE user_id = $1 RETURNING username',
      [req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({ message: 'User deactivated successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Error deleting user' });
  }
});

// Get online users
router.get('/status/online', [
  authenticateToken,
  authorizeRole('Admin')
], async (req, res) => {
  try {
    const activeUsers = await getActiveUsers();
    res.json(activeUsers);
  } catch (error) {
    console.error('Error fetching online users:', error);
    res.status(500).json({ message: 'Error fetching online users' });
  }
});

module.exports = router;