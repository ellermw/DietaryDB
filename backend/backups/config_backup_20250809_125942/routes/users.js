const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../config/database');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

// Get all users
router.get('/', [authenticateToken, authorizeRole('Admin')], async (req, res) => {
  try {
    const result = await db.query(`
      SELECT user_id, username, first_name, last_name, role, is_active, 
             created_date, last_login, last_activity
      FROM users 
      ORDER BY user_id
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Error fetching users' });
  }
});

// Get single user
router.get('/:id', [authenticateToken, authorizeRole('Admin')], async (req, res) => {
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
    res.status(500).json({ message: 'Error fetching user' });
  }
});

// Create user
router.post('/', [authenticateToken, authorizeRole('Admin')], async (req, res) => {
  try {
    const { username, password, first_name, last_name, role } = req.body;
    
    if (!username || !password || !role) {
      return res.status(400).json({ message: 'Username, password, and role are required' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await db.query(
      `INSERT INTO users (username, password_hash, first_name, last_name, role) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING user_id, username, first_name, last_name, role, is_active`,
      [username, hashedPassword, first_name || '', last_name || '', role]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      res.status(400).json({ message: 'Username already exists' });
    } else {
      console.error('Error creating user:', error);
      res.status(500).json({ message: 'Error creating user' });
    }
  }
});

// Update user
router.put('/:id', [authenticateToken, authorizeRole('Admin')], async (req, res) => {
  try {
    const { id } = req.params;
    const { username, password, first_name, last_name, role, is_active } = req.body;
    
    const updates = [];
    const values = [];
    let paramCount = 1;
    
    if (username !== undefined) {
      updates.push(`username = $${paramCount}`);
      values.push(username);
      paramCount++;
    }
    
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updates.push(`password_hash = $${paramCount}`);
      values.push(hashedPassword);
      paramCount++;
    }
    
    if (first_name !== undefined) {
      updates.push(`first_name = $${paramCount}`);
      values.push(first_name);
      paramCount++;
    }
    
    if (last_name !== undefined) {
      updates.push(`last_name = $${paramCount}`);
      values.push(last_name);
      paramCount++;
    }
    
    if (role !== undefined) {
      updates.push(`role = $${paramCount}`);
      values.push(role);
      paramCount++;
    }
    
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramCount}`);
      values.push(is_active);
      paramCount++;
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

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
    res.status(500).json({ message: 'Error updating user' });
  }
});

// Delete user - HARD DELETE
router.delete('/:id', [authenticateToken, authorizeRole('Admin')], async (req, res) => {
  const client = await db.connect();
  
  try {
    await client.query('BEGIN');
    
    // Check if it's the admin user
    const checkResult = await client.query(
      'SELECT username FROM users WHERE user_id = $1',
      [req.params.id]
    );
    
    if (checkResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (checkResult.rows[0].username === 'admin') {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Cannot delete admin user' });
    }
    
    // Delete the user (cascade will handle related records)
    await client.query('DELETE FROM users WHERE user_id = $1', [req.params.id]);
    
    await client.query('COMMIT');
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Delete error:', error);
    res.status(500).json({ message: 'Error deleting user' });
  } finally {
    client.release();
  }
});

// Deactivate user
router.put('/:id/deactivate', [authenticateToken, authorizeRole('Admin')], async (req, res) => {
  try {
    const result = await db.query(
      'UPDATE users SET is_active = false WHERE user_id = $1 RETURNING username',
      [req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({ message: 'User deactivated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deactivating user' });
  }
});

// Activate user
router.put('/:id/activate', [authenticateToken, authorizeRole('Admin')], async (req, res) => {
  try {
    const result = await db.query(
      'UPDATE users SET is_active = true WHERE user_id = $1 RETURNING username',
      [req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({ message: 'User activated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error activating user' });
  }
});

module.exports = router;
