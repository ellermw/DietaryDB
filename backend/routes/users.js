const express = require('express');
const router = express.Router();

// Get all users
router.get('/', async (req, res) => {
  try {
    const db = require('../config/database');
    const result = await db.query(
      'SELECT user_id, username, first_name, last_name, role, is_active FROM users'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Users error:', error);
    res.status(500).json({ 
      message: 'Error fetching users',
      error: error.message,
      detail: error.detail 
    });
  }
});

module.exports = router;
