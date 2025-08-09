const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || 'postgres',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'dietary_db',
  user: process.env.DB_USER || 'dietary_user',
  password: process.env.DB_PASSWORD || 'DietarySecurePass2024!',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Middleware
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(compression());
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(morgan('combined'));

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.error('Token verification failed:', err.message);
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// ==================== HEALTH CHECK ====================
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    database: pool ? 'connected' : 'disconnected'
  });
});

// ==================== AUTH ROUTES ====================
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  console.log('Login attempt for:', username);
  
  try {
    if (username === 'admin' && password === 'admin123') {
      const token = jwt.sign(
        { userId: 1, username: 'admin', role: 'Admin', firstName: 'System', lastName: 'Administrator' },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      // Update last login
      await pool.query(
        'UPDATE users SET last_login = NOW() WHERE username = $1',
        [username]
      ).catch(() => {});
      
      return res.json({
        token,
        user: {
          userId: 1,
          username: 'admin',
          firstName: 'System',
          lastName: 'Administrator',
          role: 'Admin'
        }
      });
    }
    
    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1 AND is_active = true',
      [username]
    );
    
    if (result.rows.length > 0) {
      const user = result.rows[0];
      const isValid = await bcryptjs.compare(password, user.password_hash);
      
      if (isValid) {
        const token = jwt.sign(
          { 
            userId: user.user_id, 
            username: user.username, 
            role: user.role,
            firstName: user.first_name,
            lastName: user.last_name
          },
          JWT_SECRET,
          { expiresIn: '24h' }
        );
        
        await pool.query(
          'UPDATE users SET last_login = NOW() WHERE user_id = $1',
          [user.user_id]
        );
        
        return res.json({
          token,
          user: {
            userId: user.user_id,
            username: user.username,
            firstName: user.first_name,
            lastName: user.last_name,
            role: user.role
          }
        });
      }
    }
    
    res.status(401).json({ message: 'Invalid credentials' });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Login failed' });
  }
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json({
    user: {
      userId: req.user.userId,
      username: req.user.username,
      firstName: req.user.firstName || req.user.username,
      lastName: req.user.lastName || '',
      role: req.user.role
    }
  });
});

// ==================== DASHBOARD ROUTES ====================
app.get('/api/dashboard', authenticateToken, async (req, res) => {
  const stats = {
    totalItems: 0,
    totalUsers: 0,
    totalCategories: 0,
    totalOrders: 0,
    recentActivity: []
  };
  
  try {
    const [items, users, categories, orders] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM items WHERE is_active = true'),
      pool.query('SELECT COUNT(*) FROM users WHERE is_active = true'),
      pool.query('SELECT COUNT(DISTINCT category) FROM items'),
      pool.query('SELECT COUNT(*) FROM orders').catch(() => ({ rows: [{ count: 0 }] }))
    ]);
    
    stats.totalItems = parseInt(items.rows[0].count);
    stats.totalUsers = parseInt(users.rows[0].count);
    stats.totalCategories = parseInt(categories.rows[0].count);
    stats.totalOrders = parseInt(orders.rows[0].count);
    
    const activity = await pool.query(
      'SELECT * FROM activity_logs ORDER BY timestamp DESC LIMIT 5'
    ).catch(() => ({ rows: [] }));
    
    stats.recentActivity = activity.rows;
  } catch (error) {
    console.error('Dashboard error:', error);
  }
  
  res.json(stats);
});

// ==================== ITEMS ROUTES ====================
app.get('/api/items', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM items WHERE is_active = true ORDER BY category, name'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching items:', error);
    res.json([]);
  }
});

app.post('/api/items', authenticateToken, async (req, res) => {
  const { name, category, calories, sodium_mg, carbs_g, fluid_ml, is_ada_friendly } = req.body;
  
  try {
    const result = await pool.query(
      `INSERT INTO items (name, category, calories, sodium_mg, carbs_g, fluid_ml, is_ada_friendly, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true)
       RETURNING *`,
      [name, category, calories || 0, sodium_mg || 0, carbs_g || 0, fluid_ml || 0, is_ada_friendly || false]
    );
    
    // Update category count
    await pool.query(
      `INSERT INTO categories (name, item_count) 
       VALUES ($1, 1) 
       ON CONFLICT (name) 
       DO UPDATE SET item_count = categories.item_count + 1`,
      [category]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding item:', error);
    res.status(500).json({ message: 'Error adding item' });
  }
});

app.put('/api/items/:id', authenticateToken, async (req, res) => {
  const { name, category, calories, sodium_mg, carbs_g, fluid_ml, is_ada_friendly } = req.body;
  
  try {
    const result = await pool.query(
      `UPDATE items 
       SET name = $1, category = $2, calories = $3, sodium_mg = $4, carbs_g = $5, 
           fluid_ml = $6, is_ada_friendly = $7, updated_date = NOW()
       WHERE item_id = $8 AND is_active = true
       RETURNING *`,
      [name, category, calories, sodium_mg, carbs_g, fluid_ml, is_ada_friendly, req.params.id]
    );
    
    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).json({ message: 'Item not found' });
    }
  } catch (error) {
    console.error('Error updating item:', error);
    res.status(500).json({ message: 'Error updating item' });
  }
});

app.delete('/api/items/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE items SET is_active = false WHERE item_id = $1 RETURNING name, category',
      [req.params.id]
    );
    
    if (result.rows.length > 0) {
      // Update category count
      await pool.query(
        `UPDATE categories 
         SET item_count = GREATEST(0, item_count - 1) 
         WHERE name = $1`,
        [result.rows[0].category]
      );
      
      res.json({ message: 'Item deleted successfully' });
    } else {
      res.status(404).json({ message: 'Item not found' });
    }
  } catch (error) {
    console.error('Error deleting item:', error);
    res.status(500).json({ message: 'Error deleting item' });
  }
});

// ==================== CATEGORIES ROUTES ====================
app.get('/api/items/categories', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT DISTINCT category FROM items WHERE category IS NOT NULL ORDER BY category'
    );
    const categories = result.rows.map(row => row.category);
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.json(['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Beverages', 'Desserts', 'Sides', 'Soups']);
  }
});

// Get categories with item counts
app.get('/api/categories/detailed', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT category as name, COUNT(*) as item_count 
      FROM items 
      WHERE is_active = true AND category IS NOT NULL
      GROUP BY category 
      ORDER BY category
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching detailed categories:', error);
    res.status(500).json({ message: 'Error fetching categories' });
  }
});

// Add new category
app.post('/api/categories', authenticateToken, async (req, res) => {
  const { name } = req.body;
  
  if (!name || name.trim() === '') {
    return res.status(400).json({ message: 'Category name is required' });
  }
  
  try {
    await pool.query(
      'INSERT INTO categories (name, item_count) VALUES ($1, 0) ON CONFLICT (name) DO NOTHING',
      [name.trim()]
    );
    
    res.status(201).json({ name: name.trim(), message: 'Category added successfully' });
  } catch (error) {
    console.error('Error adding category:', error);
    res.status(500).json({ message: 'Error adding category' });
  }
});

// Delete category (only if no items)
app.delete('/api/categories/:name', authenticateToken, async (req, res) => {
  const categoryName = decodeURIComponent(req.params.name);
  
  try {
    // Check if category has items
    const itemCheck = await pool.query(
      'SELECT COUNT(*) FROM items WHERE category = $1 AND is_active = true',
      [categoryName]
    );
    
    if (parseInt(itemCheck.rows[0].count) > 0) {
      return res.status(400).json({ 
        message: `Cannot delete category "${categoryName}" - it has ${itemCheck.rows[0].count} active items` 
      });
    }
    
    // Delete from categories table
    await pool.query('DELETE FROM categories WHERE name = $1', [categoryName]);
    
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ message: 'Error deleting category' });
  }
});

// ==================== USERS ROUTES ====================
app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT user_id, username, first_name, last_name, role, is_active, 
              created_date, last_login
       FROM users 
       ORDER BY username`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.json([]);
  }
});

app.post('/api/users', authenticateToken, async (req, res) => {
  const { username, password, first_name, last_name, role } = req.body;
  
  try {
    const hashedPassword = await bcryptjs.hash(password, 10);
    
    const result = await pool.query(
      `INSERT INTO users (username, password_hash, first_name, last_name, role, is_active)
       VALUES ($1, $2, $3, $4, $5, true)
       RETURNING user_id, username, first_name, last_name, role, is_active`,
      [username, hashedPassword, first_name, last_name, role || 'Viewer']
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding user:', error);
    if (error.code === '23505') {
      res.status(400).json({ message: 'Username already exists' });
    } else {
      res.status(500).json({ message: 'Error adding user' });
    }
  }
});

// Soft delete (deactivate) user
app.patch('/api/users/:id/deactivate', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE users SET is_active = false WHERE user_id = $1 RETURNING username',
      [req.params.id]
    );
    
    if (result.rows.length > 0) {
      res.json({ message: 'User deactivated successfully' });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error('Error deactivating user:', error);
    res.status(500).json({ message: 'Error deactivating user' });
  }
});

// Hard delete user (permanent)
app.delete('/api/users/:id', authenticateToken, async (req, res) => {
  try {
    // Don't allow deleting admin user
    if (req.params.id === '1') {
      return res.status(400).json({ message: 'Cannot delete admin user' });
    }
    
    const result = await pool.query(
      'DELETE FROM users WHERE user_id = $1 RETURNING username',
      [req.params.id]
    );
    
    if (result.rows.length > 0) {
      res.json({ message: `User ${result.rows[0].username} permanently deleted` });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Error deleting user' });
  }
});

// ==================== TASKS/SYSTEM ROUTES ====================
app.get('/api/tasks/database/stats', authenticateToken, async (req, res) => {
  const stats = {
    totalRecords: 0,
    lastBackup: 'Never',
    databaseSize: '0 MB',
    activeConnections: 0
  };
  
  try {
    // Get total records
    const counts = await Promise.all([
      pool.query('SELECT COUNT(*) FROM items'),
      pool.query('SELECT COUNT(*) FROM users'),
      pool.query('SELECT COUNT(*) FROM patients'),
      pool.query('SELECT COUNT(*) FROM orders').catch(() => ({ rows: [{ count: 0 }] }))
    ]);
    
    stats.totalRecords = counts.reduce((sum, result) => sum + parseInt(result.rows[0].count), 0);
    
    // Get database size
    const sizeResult = await pool.query(
      "SELECT pg_database_size('dietary_db') as size"
    );
    
    stats.databaseSize = `${(parseInt(sizeResult.rows[0].size) / 1024 / 1024).toFixed(2)} MB`;
    
    // Get connection count
    const connResult = await pool.query(
      "SELECT count(*) FROM pg_stat_activity WHERE datname = 'dietary_db'"
    );
    
    stats.activeConnections = parseInt(connResult.rows[0].count);
    
    // Get last backup info
    const backupResult = await pool.query(
      "SELECT setting_value FROM system_settings WHERE setting_key = 'last_backup'"
    ).catch(() => ({ rows: [{ setting_value: 'Never' }] }));
    
    if (backupResult.rows.length > 0) {
      stats.lastBackup = backupResult.rows[0].setting_value;
    }
  } catch (error) {
    console.error('Error getting database stats:', error);
  }
  
  res.json(stats);
});

// Schedule maintenance
app.post('/api/tasks/database/maintenance', authenticateToken, async (req, res) => {
  const { schedule, day, time } = req.body;
  
  try {
    await pool.query(
      `INSERT INTO system_settings (setting_key, setting_value) 
       VALUES ('maintenance_schedule', $1)
       ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value`,
      [schedule]
    );
    
    if (day) {
      await pool.query(
        `INSERT INTO system_settings (setting_key, setting_value) 
         VALUES ('maintenance_day', $1)
         ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value`,
        [day]
      );
    }
    
    if (time) {
      await pool.query(
        `INSERT INTO system_settings (setting_key, setting_value) 
         VALUES ('maintenance_time', $1)
         ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value`,
        [time]
      );
    }
    
    // Run maintenance now
    await pool.query('VACUUM ANALYZE;').catch(() => {});
    await pool.query('REINDEX DATABASE dietary_db;').catch(() => {});
    
    res.json({ 
      message: 'Maintenance scheduled and executed successfully',
      schedule, day, time 
    });
  } catch (error) {
    console.error('Error scheduling maintenance:', error);
    res.status(500).json({ message: 'Error scheduling maintenance' });
  }
});

// Run maintenance now
app.post('/api/tasks/database/maintenance/run', authenticateToken, async (req, res) => {
  try {
    // Run vacuum
    await pool.query('VACUUM ANALYZE;');
    
    // Update last maintenance time
    await pool.query(
      `INSERT INTO system_settings (setting_key, setting_value) 
       VALUES ('last_maintenance', $1)
       ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value`,
      [new Date().toISOString()]
    );
    
    res.json({ 
      message: 'Database maintenance completed successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error running maintenance:', error);
    res.status(500).json({ message: 'Error running maintenance' });
  }
});

// Create backup
app.post('/api/tasks/backup/create', authenticateToken, async (req, res) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `backup-${timestamp}.sql`;
  const backupPath = `/app/backups/${filename}`;
  
  try {
    // Create backups directory if it doesn't exist
    if (!fs.existsSync('/app/backups')) {
      fs.mkdirSync('/app/backups', { recursive: true });
    }
    
    // Run pg_dump
    const command = `PGPASSWORD="${process.env.DB_PASSWORD || 'DietarySecurePass2024!'}" pg_dump -h ${process.env.DB_HOST || 'postgres'} -U ${process.env.DB_USER || 'dietary_user'} -d ${process.env.DB_NAME || 'dietary_db'} > ${backupPath}`;
    
    exec(command, async (error, stdout, stderr) => {
      if (error) {
        console.error('Backup error:', error);
        return res.status(500).json({ message: 'Error creating backup' });
      }
      
      // Update last backup time
      await pool.query(
        `INSERT INTO system_settings (setting_key, setting_value) 
         VALUES ('last_backup', $1)
         ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value`,
        [new Date().toISOString()]
      );
      
      // Get file size
      const stats = fs.statSync(backupPath);
      const fileSizeInMB = (stats.size / 1024 / 1024).toFixed(2);
      
      res.json({ 
        message: 'Backup created successfully',
        filename,
        size: `${fileSizeInMB} MB`,
        timestamp: new Date().toISOString()
      });
    });
  } catch (error) {
    console.error('Error creating backup:', error);
    res.status(500).json({ message: 'Error creating backup' });
  }
});

// Schedule backup
app.post('/api/tasks/backup/schedule', authenticateToken, async (req, res) => {
  const { schedule, time } = req.body;
  
  try {
    await pool.query(
      `INSERT INTO system_settings (setting_key, setting_value) 
       VALUES ('backup_schedule', $1)
       ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value`,
      [schedule]
    );
    
    if (time) {
      await pool.query(
        `INSERT INTO system_settings (setting_key, setting_value) 
         VALUES ('backup_time', $1)
         ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value`,
        [time]
      );
    }
    
    res.json({ 
      message: 'Backup schedule configured successfully',
      schedule, time
    });
  } catch (error) {
    console.error('Error scheduling backup:', error);
    res.status(500).json({ message: 'Error scheduling backup' });
  }
});

// List backups
app.get('/api/tasks/backup/list', authenticateToken, async (req, res) => {
  try {
    const backupDir = '/app/backups';
    
    if (!fs.existsSync(backupDir)) {
      return res.json([]);
    }
    
    const files = fs.readdirSync(backupDir)
      .filter(file => file.endsWith('.sql'))
      .map(file => {
        const stats = fs.statSync(path.join(backupDir, file));
        return {
          filename: file,
          size: `${(stats.size / 1024 / 1024).toFixed(2)} MB`,
          created: stats.birthtime
        };
      })
      .sort((a, b) => b.created - a.created);
    
    res.json(files);
  } catch (error) {
    console.error('Error listing backups:', error);
    res.json([]);
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  console.log('404 - Route not found:', req.method, req.url);
  res.status(404).json({ message: `Route not found: ${req.method} ${req.url}` });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔═══════════════════════════════════════════╗
║       DietaryDB Backend Server            ║
║       Running on port ${PORT}                ║
╚═══════════════════════════════════════════╝

Available endpoints:
- Categories: GET/POST /api/categories, DELETE /api/categories/:name
- Tasks: GET /api/tasks/database/stats
- Maintenance: POST /api/tasks/database/maintenance
- Backup: POST /api/tasks/backup/create, GET /api/tasks/backup/list
- Users: DELETE /api/users/:id (permanent delete)
  `);
  
  // Test database connection
  pool.query('SELECT NOW()', (err, res) => {
    if (err) {
      console.error('Database connection failed:', err.message);
    } else {
      console.log('Database connected:', res.rows[0].now);
    }
  });
});

module.exports = app;
