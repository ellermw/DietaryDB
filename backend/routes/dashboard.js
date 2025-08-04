const express = require('express');
const db = require('../config/database');
const router = express.Router();

router.get('/stats', async (req, res) => {
  try {
    const users = await db.query('SELECT COUNT(*) as count FROM users WHERE is_active = true');
    const items = await db.query('SELECT COUNT(*) as count FROM items WHERE is_active = true');
    
    res.json({
      activePatients: 0,
      pendingOrders: 0,
      totalItems: parseInt(items.rows[0]?.count || 0),
      totalUsers: parseInt(users.rows[0]?.count || 0)
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.json({
      activePatients: 0,
      pendingOrders: 0,
      totalItems: 0,
      totalUsers: 0
    });
  }
});

router.get('/activity', async (req, res) => {
  res.json({
    activeUsers: [],
    recentActivity: []
  });
});

module.exports = router;
