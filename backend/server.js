const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const pool = new Pool({
  host: process.env.DB_HOST || 'postgres',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'dietary_db',
  user: process.env.DB_USER || 'dietary_user',
  password: process.env.DB_PASSWORD,
});

// Middleware to verify JWT
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-jwt-key-change-this-in-production');
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

// Auth endpoints
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  
  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password);
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
      { user_id: user.user_id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'your-secret-jwt-key-change-this-in-production',
      { expiresIn: '24h' }
    );
    
    res.json({
      token,
      user: {
        username: user.username,
        full_name: user.full_name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/api/auth/verify', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT username, full_name, role FROM users WHERE user_id = $1',
      [req.user.user_id]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    res.json({
      valid: true,
      user: result.rows[0]
    });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Stats endpoints
app.get('/api/system/stats', verifyToken, async (req, res) => {
  try {
    const dbSize = await pool.query("SELECT pg_database_size(current_database()) as size");
    
    res.json({
      database: {
        size: `${(dbSize.rows[0].size / (1024 * 1024)).toFixed(2)} MB`,
        tables: 6,
        connections: 1,
        uptime: 86400,
        cacheHitRate: '99.5',
        avgQueryTime: '0.5',
        version: '15.0'
      },
      activity: {
        todayOrders: 0,
        weekOrders: 0,
        recentChanges: 0
      },
      system: {
        nodeVersion: process.version.replace('v', ''),
        memoryUsage: Math.round((process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

app.get('/api/patients/stats/summary', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE NOT discharged) as active_patients,
        COUNT(*) FILTER (WHERE ada_diet = true AND NOT discharged) as ada_patients,
        COUNT(*) FILTER (WHERE diet_type = 'Puree' AND NOT discharged) as puree_patients
      FROM patient_info
    `);
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch patient stats' });
  }
});

app.get('/api/items/stats/summary', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_items,
        COUNT(*) FILTER (WHERE is_active = true) as active_items,
        COUNT(*) FILTER (WHERE is_ada_friendly = true) as ada_items,
        COUNT(DISTINCT category) as total_categories
      FROM items
    `);
    res.json({ summary: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch item stats' });
  }
});

app.get('/api/users/stats/summary', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE is_active = true) as active,
        COUNT(*) FILTER (WHERE role = 'Admin') as admins
      FROM users
    `);
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user stats' });
  }
});

app.get('/api/system/activity/recent', verifyToken, async (req, res) => {
  res.json({ activity: [] });
});

// Items endpoints
app.get('/api/items', verifyToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM items ORDER BY category, name');
    res.json({ items: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

app.get('/api/items/categories/list', verifyToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categories ORDER BY sort_order');
    res.json({ categories: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Users endpoints
app.get('/api/users', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT user_id, username, full_name, role, is_active, last_login FROM users ORDER BY full_name'
    );
    res.json({ users: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Backup endpoints
app.get('/api/admin/backups', verifyToken, (req, res) => {
  res.json({ backups: [] });
});

app.get('/api/admin/backup/schedule', verifyToken, (req, res) => {
  res.json({
    enabled: false,
    frequency: 'daily',
    time: '02:00',
    retention_days: 30,
    auto_vacuum: true,
    auto_analyze: true
  });
});

// Audit endpoints
app.get('/api/admin/audit-logs', verifyToken, (req, res) => {
  res.json({ logs: [], total: 0, pages: 0 });
});

app.get('/api/admin/audit-logs/stats', verifyToken, (req, res) => {
  res.json({
    total_actions: 0,
    actions_today: 0,
    unique_users: 0,
    most_active_table: ''
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
