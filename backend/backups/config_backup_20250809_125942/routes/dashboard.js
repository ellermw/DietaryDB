const express = require('express');
const db = require('../config/database');
const router = express.Router();

// Get dashboard statistics
router.get('/', async (req, res) => {
  try {
    console.log('Dashboard route accessed');
    
    // Get statistics from database
    const [itemCount, userCount, categoryCount] = await Promise.all([
      db.query('SELECT COUNT(*) FROM items WHERE is_active = true'),
      db.query('SELECT COUNT(*) FROM users WHERE is_active = true'),
      db.query('SELECT COUNT(DISTINCT category) FROM items')
    ]);
    
    // Get recent activity
    const recentItems = await db.query(
      'SELECT name, category, created_date FROM items ORDER BY created_date DESC LIMIT 5'
    );
    
    res.json({
      totalItems: parseInt(itemCount.rows[0].count) || 0,
      totalUsers: parseInt(userCount.rows[0].count) || 0,
      totalCategories: parseInt(categoryCount.rows[0].count) || 0,
      recentActivity: recentItems.rows || []
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    // Return mock data if database fails
    res.json({
      totalItems: 0,
      totalUsers: 1,
      totalCategories: 0,
      recentActivity: []
    });
  }
});

// Get detailed statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM items WHERE is_active = true) as total_items,
        (SELECT COUNT(*) FROM users WHERE is_active = true) as total_users,
        (SELECT COUNT(DISTINCT category) FROM items) as total_categories,
        (SELECT COUNT(*) FROM items WHERE is_ada_friendly = true) as ada_items
    `);
    
    res.json(stats.rows[0]);
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ message: 'Error fetching statistics' });
  }
});

module.exports = router;
