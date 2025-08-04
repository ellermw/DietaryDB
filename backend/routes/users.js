const express = require('express');
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

// Get all users
router.get('/', [
  authenticateToken,
  authorizeRole('Admin')
], async (req, res) => {
  try {
    const result = await db.query(
      'SELECT user_id, username, first_name, last_name, role, is_active, last_login, created_date FROM users ORDER BY created_date DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Error fetching users' });
  }
});

// Create new user
router.post('/', [
  authenticateToken,
  authorizeRole('Admin'),
  body('username').isLength({ min: 3 }).trim(),
  body('password').isLength({ min: 6 }),
  body('first_name').notEmpty().trim(),
  body('last_name').notEmpty().trim(),
  body('role').isIn(['Admin', 'User'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password, first_name, last_name, role } = req.body;
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await db.query(
      `INSERT INTO users (username, password, first_name, last_name, role) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING user_id, username, first_name, last_name, role, is_active`,
      [username, hashedPassword, first_name, last_name, role]
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

module.exports = router;
