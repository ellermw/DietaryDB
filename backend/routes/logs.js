const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'dietary_postgres',
  port: 5432,
  database: process.env.DB_NAME || 'dietary_db',
  user: process.env.DB_USER || 'dietary_user',
  password: process.env.DB_PASSWORD || 'DietarySecurePass2024!'
});

// Get activity logs with filtering and sorting
router.get('/', async (req, res) => {
  try {
    const { user, action, limit = 1000, offset = 0, sort = 'created_date', order = 'DESC' } = req.query;
    
    let query = 'SELECT * FROM activity_log WHERE 1=1';
    const params = [];
    let paramCount = 0;
    
    if (user) {
      params.push(user);
      query += ` AND username = $${++paramCount}`;
    }
    
    if (action) {
      params.push(`%${action}%`);
      query += ` AND action LIKE $${++paramCount}`;
    }
    
    query += ` ORDER BY ${sort} ${order}`;
    query += ` LIMIT ${limit} OFFSET ${offset}`;
    
    const result = await pool.query(query, params);
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM activity_log WHERE 1=1';
    if (user) countQuery += ` AND username = '${user}'`;
    if (action) countQuery += ` AND action LIKE '%${action}%'`;
    
    const countResult = await pool.query(countQuery);
    
    res.json({
      logs: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Logs error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get recent activity for dashboard
router.get('/recent', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT username, action, details, created_date
      FROM activity_log
      ORDER BY created_date DESC
      LIMIT 10
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Recent activity error:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
