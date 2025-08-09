const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
  console.log('Dashboard accessed');
  
  let stats = {
    totalItems: 12,
    totalUsers: 4,
    totalCategories: 8,
    totalPatients: 5,
    recentActivity: [
      { name: 'Scrambled Eggs', category: 'Breakfast' },
      { name: 'Oatmeal', category: 'Breakfast' },
      { name: 'Orange Juice', category: 'Beverages' },
      { name: 'Grilled Chicken', category: 'Lunch' },
      { name: 'Garden Salad', category: 'Lunch' }
    ]
  };
  
  // Try to get real counts from database
  try {
    const { Pool } = require('pg');
    const pool = new Pool({
      host: process.env.DB_HOST || 'postgres',
      port: 5432,
      database: 'dietary_db',
      user: 'dietary_user',
      password: process.env.DB_PASSWORD || 'DietarySecurePass2024!'
    });
    
    const [items, users, categories] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM items WHERE is_active = true'),
      pool.query('SELECT COUNT(*) FROM users WHERE is_active = true'),
      pool.query('SELECT COUNT(DISTINCT category) FROM items')
    ]);
    
    const recentItems = await pool.query(
      'SELECT name, category FROM items ORDER BY created_date DESC LIMIT 5'
    );
    
    await pool.end();
    
    stats.totalItems = parseInt(items.rows[0]?.count) || stats.totalItems;
    stats.totalUsers = parseInt(users.rows[0]?.count) || stats.totalUsers;
    stats.totalCategories = parseInt(categories.rows[0]?.count) || stats.totalCategories;
    
    if (recentItems.rows.length > 0) {
      stats.recentActivity = recentItems.rows;
    }
  } catch (err) {
    console.log('Dashboard database query failed, using defaults:', err.message);
  }
  
  res.json(stats);
});

module.exports = router;
