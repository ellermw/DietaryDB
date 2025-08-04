const express = require('express');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const [usersResult, itemsResult] = await Promise.all([
      db.query('SELECT COUNT(*) as count FROM users WHERE is_active = true'),
      db.query('SELECT COUNT(*) as count FROM items WHERE is_active = true')
    ]);
    
    const activeUsersResult = await db.query(`
      SELECT first_name, last_name, username, last_login
      FROM users 
      WHERE last_login > NOW() - INTERVAL '30 minutes'
      AND is_active = true
      ORDER BY last_login DESC
    `);
    
    const lastActivityResult = await db.query(`
      SELECT first_name, last_name, last_login as timestamp
      FROM users
      WHERE last_login IS NOT NULL
      ORDER BY last_login DESC
      LIMIT 1
    `);
    
    res.json({
      stats: {
        activePatients: 0,
        pendingOrders: 0,
        totalItems: parseInt(itemsResult.rows[0].count) || 0,
        totalUsers: parseInt(usersResult.rows[0].count) || 0
      },
      userActivity: {
        activeUsers: activeUsersResult.rows.map(u => u.first_name),
        lastActivity: lastActivityResult.rows[0] ? {
          user: `${lastActivityResult.rows[0].first_name} ${lastActivityResult.rows[0].last_name}`,
          action: 'logged in',
          timestamp: lastActivityResult.rows[0].timestamp
        } : null
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ message: 'Error fetching dashboard statistics' });
  }
});

module.exports = router;
