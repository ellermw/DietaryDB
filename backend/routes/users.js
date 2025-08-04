const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../config/database');
const router = express.Router();

// Get all users - WORKING
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT user_id, username, first_name, last_name, role, is_active, created_date FROM users ORDER BY username'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Error fetching users', error: error.message });
  }
});

// Get single user
router.get('/:id', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT user_id, username, first_name, last_name, role, is_active FROM users WHERE user_id = $1',
      [req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Error fetching user', error: error.message });
  }
});

// Create new user - FIXED
router.post('/', async (req, res) => {
  try {
    const { username, password, first_name, last_name, role } = req.body;
    
    // Basic validation
    if (!username || !password || !first_name || !last_name || !role) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    
    // Check if username already exists
    const existingUser = await db.query(
      'SELECT user_id FROM users WHERE username = $1',
      [username]
    );
    
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: 'Username already exists' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Insert user
    const result = await db.query(
      `INSERT INTO users (username, password, first_name, last_name, role) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING user_id, username, first_name, last_name, role, is_active`,
      [username, hashedPassword, first_name, last_name, role]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'Error creating user', error: error.message });
  }
});

// Update user - WORKING
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = [];
    const values = [];
    let paramCount = 1;

    // Handle password separately if provided
    if (req.body.password && req.body.password.length > 0) {
      const hashedPassword = await bcrypt.hash(req.body.password, 10);
      updates.push(`password = $${paramCount++}`);
      values.push(hashedPassword);
    }

    // Handle other fields
    const fields = ['username', 'first_name', 'last_name', 'role', 'is_active'];
    fields.forEach(field => {
      if (req.body.hasOwnProperty(field)) {
        updates.push(`${field} = $${paramCount++}`);
        values.push(req.body[field]);
      }
    });

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    // Add the ID as the last parameter
    values.push(id);

    const query = `
      UPDATE users 
      SET ${updates.join(', ')} 
      WHERE user_id = $${paramCount}
      RETURNING user_id, username, first_name, last_name, role, is_active
    `;

    const result = await db.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Error updating user', error: error.message });
  }
});

// Delete (deactivate) user
router.delete('/:id', async (req, res) => {
  try {
    // Don't allow deleting the admin user
    const userCheck = await db.query(
      'SELECT username FROM users WHERE user_id = $1',
      [req.params.id]
    );
    
    if (userCheck.rows.length > 0 && userCheck.rows[0].username === 'admin') {
      return res.status(400).json({ message: 'Cannot delete system admin user' });
    }
    
    const result = await db.query(
      'UPDATE users SET is_active = false WHERE user_id = $1 RETURNING username',
      [req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({ message: `User "${result.rows[0].username}" deactivated successfully` });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Error deleting user', error: error.message });
  }
});

module.exports = router;
