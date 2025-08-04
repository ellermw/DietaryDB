const express = require('express');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/stats', authenticateToken, async (req, res) => {
  try {
    // Get main stats
    const statsResult = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM items WHERE is_active = true) as total_items,
        (SELECT COUNT(DISTINCT category) FROM items WHERE is_active = true) as total_categories,
        (SELECT COUNT(*) FROM users WHERE is_active = true) as total_users
    `);
    
    // Get user activity
    const activityResult = await db.query(`
      SELECT 
        COUNT(*) as total_logins,
        COUNT(DISTINCT user_id) as unique_users,
        MAX(last_login) as last_activity
      FROM users 
      WHERE last_login IS NOT NULL 
        AND last_login > CURRENT_TIMESTAMP - INTERVAL '24 hours'
    `);
    
    res.json({
      ...statsResult.rows[0],
      user_activity: activityResult.rows[0]
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ message: 'Error fetching statistics' });
  }
});

module.exports = router;
