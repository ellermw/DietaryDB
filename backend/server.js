const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Database configuration
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});

// Middleware
app.use(helmet());
app.use(compression());
app.use(morgan('combined'));
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Verify token middleware
const verifyToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = decoded;
    next();
  });
};

// Audit logging function
async function logAudit(tableName, recordId, action, changedBy, oldValues = null, newValues = null) {
  try {
    await pool.query(
      `INSERT INTO audit_log (table_name, record_id, action, changed_by, old_values, new_values)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [tableName, recordId, action, changedBy, oldValues, newValues]
    );
  } catch (error) {
    console.error('Audit logging error:', error);
  }
}

// Authentication endpoints
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
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
      { userId: user.user_id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );
    
    // Update last login
    await pool.query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE user_id = $1', [user.user_id]);
    
    res.json({
      token,
      user: {
        userId: user.user_id,
        username: user.username,
        fullName: user.full_name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Dashboard statistics
app.get('/api/dashboard/stats', verifyToken, async (req, res) => {
  try {
    const stats = {};
    
    // Database info
    const dbSize = await pool.query(`
      SELECT pg_database_size(current_database()) as size,
             current_database() as name
    `);
    
    const tableCount = await pool.query(`
      SELECT COUNT(*) FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);
    
    // User stats
    const userStats = await pool.query(`
      SELECT COUNT(*) as total,
             COUNT(CASE WHEN is_active = true THEN 1 END) as active,
             COUNT(CASE WHEN role = 'Admin' THEN 1 END) as admins,
             COUNT(CASE WHEN last_login > NOW() - INTERVAL '24 hours' THEN 1 END) as active_today
      FROM users
    `);
    
    // Item stats
    const itemStats = await pool.query(`
      SELECT COUNT(*) as total,
             COUNT(CASE WHEN is_active = true THEN 1 END) as active,
             COUNT(DISTINCT category) as categories
      FROM items
    `);
    
    // Patient stats
    const patientStats = await pool.query(`
      SELECT COUNT(*) as total,
             COUNT(CASE WHEN discharged = false THEN 1 END) as active,
             COUNT(DISTINCT wing) as wings
      FROM patient_info
    `);
    
    // Order stats
    const orderStats = await pool.query(`
      SELECT COUNT(*) as total_today,
             COUNT(DISTINCT patient_id) as unique_patients
      FROM meal_orders
      WHERE order_date = CURRENT_DATE
    `);
    
    // Recent activity
    const recentActivity = await pool.query(`
      SELECT COUNT(*) as actions_today,
             COUNT(DISTINCT changed_by) as unique_users
      FROM audit_log
      WHERE change_date > NOW() - INTERVAL '24 hours'
    `);
    
    stats.database = {
      size: parseInt(dbSize.rows[0].size),
      name: dbSize.rows[0].name,
      tables: parseInt(tableCount.rows[0].count)
    };
    
    stats.users = {
      total: parseInt(userStats.rows[0].total),
      active: parseInt(userStats.rows[0].active),
      admins: parseInt(userStats.rows[0].admins),
      activeToday: parseInt(userStats.rows[0].active_today)
    };
    
    stats.items = {
      total: parseInt(itemStats.rows[0].total),
      active: parseInt(itemStats.rows[0].active),
      categories: parseInt(itemStats.rows[0].categories)
    };
    
    stats.patients = {
      total: parseInt(patientStats.rows[0].total),
      active: parseInt(patientStats.rows[0].active),
      wings: parseInt(patientStats.rows[0].wings)
    };
    
    stats.orders = {
      today: parseInt(orderStats.rows[0].total_today),
      uniquePatients: parseInt(orderStats.rows[0].unique_patients)
    };
    
    stats.activity = {
      actionsToday: parseInt(recentActivity.rows[0].actions_today),
      uniqueUsers: parseInt(recentActivity.rows[0].unique_users)
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// Recent activity for dashboard
app.get('/api/dashboard/recent-activity', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT audit_id, table_name, action, changed_by, change_date
      FROM audit_log
      ORDER BY change_date DESC
      LIMIT 10
    `);
    res.json({ activities: result.rows });
  } catch (error) {
    console.error('Recent activity error:', error);
    res.status(500).json({ error: 'Failed to fetch recent activity' });
  }
});

// Items endpoints
app.get('/api/items', verifyToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM items ORDER BY category, name');
    res.json({ items: result.rows });
  } catch (error) {
    console.error('Items fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

app.post('/api/items', verifyToken, async (req, res) => {
  try {
    const { name, category, description, is_ada_friendly, is_active } = req.body;
    const result = await pool.query(
      `INSERT INTO items (name, category, description, is_ada_friendly, is_active)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, category, description, is_ada_friendly || false, is_active !== false]
    );
    
    await logAudit('items', result.rows[0].item_id, 'INSERT', req.user.username, null, result.rows[0]);
    
    res.json({ item: result.rows[0] });
  } catch (error) {
    console.error('Item create error:', error);
    res.status(500).json({ error: 'Failed to create item' });
  }
});

app.put('/api/items/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, description, is_ada_friendly, is_active } = req.body;
    
    // Get old values for audit
    const oldResult = await pool.query('SELECT * FROM items WHERE item_id = $1', [id]);
    
    const result = await pool.query(
      `UPDATE items 
       SET name = $1, category = $2, description = $3, is_ada_friendly = $4, is_active = $5, updated_date = CURRENT_TIMESTAMP
       WHERE item_id = $6
       RETURNING *`,
      [name, category, description, is_ada_friendly, is_active, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    await logAudit('items', id, 'UPDATE', req.user.username, oldResult.rows[0], result.rows[0]);
    
    res.json({ item: result.rows[0] });
  } catch (error) {
    console.error('Item update error:', error);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

app.delete('/api/items/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get old values for audit
    const oldResult = await pool.query('SELECT * FROM items WHERE item_id = $1', [id]);
    
    const result = await pool.query('DELETE FROM items WHERE item_id = $1 RETURNING item_id', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    await logAudit('items', id, 'DELETE', req.user.username, oldResult.rows[0], null);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Item delete error:', error);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

// Categories endpoints
app.get('/api/categories', verifyToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categories ORDER BY sort_order, category_name');
    res.json({ categories: result.rows });
  } catch (error) {
    console.error('Categories fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

app.post('/api/categories', verifyToken, async (req, res) => {
  try {
    const { category_name, description, sort_order } = req.body;
    const result = await pool.query(
      `INSERT INTO categories (category_name, description, sort_order)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [category_name, description, sort_order || 0]
    );
    
    await logAudit('categories', result.rows[0].category_id, 'INSERT', req.user.username, null, result.rows[0]);
    
    res.json({ category: result.rows[0] });
  } catch (error) {
    console.error('Category create error:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

app.put('/api/categories/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { category_name, description, sort_order } = req.body;
    
    const oldResult = await pool.query('SELECT * FROM categories WHERE category_id = $1', [id]);
    
    const result = await pool.query(
      `UPDATE categories 
       SET category_name = $1, description = $2, sort_order = $3
       WHERE category_id = $4
       RETURNING *`,
      [category_name, description, sort_order, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    await logAudit('categories', id, 'UPDATE', req.user.username, oldResult.rows[0], result.rows[0]);
    
    res.json({ category: result.rows[0] });
  } catch (error) {
    console.error('Category update error:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

app.delete('/api/categories/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const oldResult = await pool.query('SELECT * FROM categories WHERE category_id = $1', [id]);
    
    const result = await pool.query('DELETE FROM categories WHERE category_id = $1 RETURNING category_id', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    await logAudit('categories', id, 'DELETE', req.user.username, oldResult.rows[0], null);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Category delete error:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

// Users endpoints
app.get('/api/users', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT user_id, username, full_name, role, is_active, last_login, created_date FROM users ORDER BY full_name'
    );
    res.json({ users: result.rows });
  } catch (error) {
    console.error('Users fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.post('/api/users', verifyToken, async (req, res) => {
  try {
    const { username, password, full_name, role, is_active } = req.body;
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await pool.query(
      `INSERT INTO users (username, password, full_name, role, is_active, must_change_password)
       VALUES ($1, $2, $3, $4, $5, true)
       RETURNING user_id, username, full_name, role, is_active, created_date`,
      [username, hashedPassword, full_name, role || 'User', is_active !== false]
    );
    
    await logAudit('users', result.rows[0].user_id, 'INSERT', req.user.username, null, result.rows[0]);
    
    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('User create error:', error);
    if (error.code === '23505') {
      res.status(400).json({ error: 'Username already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create user' });
    }
  }
});

app.put('/api/users/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { username, full_name, role, is_active } = req.body;
    
    const oldResult = await pool.query('SELECT user_id, username, full_name, role, is_active FROM users WHERE user_id = $1', [id]);
    
    const result = await pool.query(
      `UPDATE users 
       SET username = $1, full_name = $2, role = $3, is_active = $4, updated_date = CURRENT_TIMESTAMP
       WHERE user_id = $5
       RETURNING user_id, username, full_name, role, is_active`,
      [username, full_name, role, is_active, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    await logAudit('users', id, 'UPDATE', req.user.username, oldResult.rows[0], result.rows[0]);
    
    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('User update error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

app.put('/api/users/:id/password', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    await pool.query(
      'UPDATE users SET password = $1, must_change_password = false WHERE user_id = $2',
      [hashedPassword, id]
    );
    
    await logAudit('users', id, 'PASSWORD_CHANGE', req.user.username);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Password update error:', error);
    res.status(500).json({ error: 'Failed to update password' });
  }
});

app.delete('/api/users/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Prevent self-deletion
    if (req.user.userId === parseInt(id)) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    
    const oldResult = await pool.query('SELECT user_id, username, full_name, role FROM users WHERE user_id = $1', [id]);
    
    const result = await pool.query('DELETE FROM users WHERE user_id = $1 RETURNING user_id', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    await logAudit('users', id, 'DELETE', req.user.username, oldResult.rows[0], null);
    
    res.json({ success: true });
  } catch (error) {
    console.error('User delete error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Backup endpoints
app.get('/api/backup/status', verifyToken, async (req, res) => {
  try {
    const backupsDir = path.join(__dirname, '..', 'backups');
    
    // Ensure backups directory exists
    try {
      await fs.access(backupsDir);
    } catch {
      await fs.mkdir(backupsDir, { recursive: true });
    }
    
    const files = await fs.readdir(backupsDir);
    const backupFiles = files.filter(f => f.endsWith('.sql') || f.endsWith('.backup'));
    
    const backups = await Promise.all(
      backupFiles.map(async (file) => {
        const stats = await fs.stat(path.join(backupsDir, file));
        return {
          filename: file,
          size: stats.size,
          created: stats.mtime,
          path: path.join(backupsDir, file)
        };
      })
    );
    
    res.json({
      backups: backups.sort((a, b) => b.created - a.created),
      lastBackup: backups.length > 0 ? backups[0].created : null
    });
  } catch (error) {
    console.error('Backup status error:', error);
    res.status(500).json({ error: 'Failed to get backup status' });
  }
});

app.post('/api/backup/create', verifyToken, async (req, res) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup_${timestamp}.sql`;
    const backupPath = path.join(__dirname, '..', 'backups', filename);
    
    const command = `pg_dump -h ${process.env.DB_HOST} -p ${process.env.DB_PORT} -U ${process.env.DB_USER} -d ${process.env.DB_NAME} -f ${backupPath}`;
    
    await execPromise(command, { env: { ...process.env, PGPASSWORD: process.env.DB_PASSWORD } });
    
    const stats = await fs.stat(backupPath);
    
    await logAudit('system', null, 'BACKUP_CREATE', req.user.username, null, { filename });
    
    res.json({
      success: true,
      backup: {
        filename,
        size: stats.size,
        created: stats.mtime
      }
    });
  } catch (error) {
    console.error('Backup create error:', error);
    res.status(500).json({ error: 'Failed to create backup' });
  }
});

app.post('/api/backup/restore', verifyToken, async (req, res) => {
  try {
    const { filename } = req.body;
    
    if (!filename || !filename.match(/^backup_[\d\-T]+\.sql$/)) {
      return res.status(400).json({ error: 'Invalid backup filename' });
    }
    
    const backupPath = path.join(__dirname, '..', 'backups', filename);
    
    // Verify file exists
    await fs.access(backupPath);
    
    const command = `psql -h ${process.env.DB_HOST} -p ${process.env.DB_PORT} -U ${process.env.DB_USER} -d ${process.env.DB_NAME} -f ${backupPath}`;
    
    await execPromise(command, { env: { ...process.env, PGPASSWORD: process.env.DB_PASSWORD } });
    
    await logAudit('system', null, 'BACKUP_RESTORE', req.user.username, null, { filename });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Backup restore error:', error);
    res.status(500).json({ error: 'Failed to restore backup' });
  }
});

app.delete('/api/backup/:filename', verifyToken, async (req, res) => {
  try {
    const { filename } = req.params;
    
    if (!filename || !filename.match(/^backup_[\d\-T]+\.sql$/)) {
      return res.status(400).json({ error: 'Invalid backup filename' });
    }
    
    const backupPath = path.join(__dirname, '..', 'backups', filename);
    
    await fs.unlink(backupPath);
    
    await logAudit('system', null, 'BACKUP_DELETE', req.user.username, null, { filename });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Backup delete error:', error);
    res.status(500).json({ error: 'Failed to delete backup' });
  }
});

app.get('/api/backup/schedule', verifyToken, async (req, res) => {
  try {
    // Read from config file or return defaults
    const configPath = path.join(__dirname, '..', 'backup-config.json');
    
    try {
      const config = await fs.readFile(configPath, 'utf8');
      res.json(JSON.parse(config));
    } catch {
      res.json({
        enabled: false,
        frequency: 'daily',
        time: '02:00',
        retention_days: 30
      });
    }
  } catch (error) {
    console.error('Schedule fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch schedule' });
  }
});

app.post('/api/backup/schedule', verifyToken, async (req, res) => {
  try {
    const { enabled, frequency, time, retention_days } = req.body;
    const config = { enabled, frequency, time, retention_days };
    
    const configPath = path.join(__dirname, '..', 'backup-config.json');
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    
    await logAudit('system', null, 'BACKUP_SCHEDULE_UPDATE', req.user.username, null, config);
    
    res.json({ success: true, config });
  } catch (error) {
    console.error('Schedule update error:', error);
    res.status(500).json({ error: 'Failed to update schedule' });
  }
});

// Audit log endpoints
app.get('/api/audit-logs', verifyToken, async (req, res) => {
  try {
    const { page = 1, limit = 50, table, user, action, startDate, endDate } = req.query;
    const offset = (page - 1) * limit;
    
    let query = 'SELECT * FROM audit_log WHERE 1=1';
    const params = [];
    let paramCount = 0;
    
    if (table) {
      params.push(table);
      query += ` AND table_name = $${++paramCount}`;
    }
    
    if (user) {
      params.push(user);
      query += ` AND changed_by = $${++paramCount}`;
    }
    
    if (action) {
      params.push(action);
      query += ` AND action = $${++paramCount}`;
    }
    
    if (startDate) {
      params.push(startDate);
      query += ` AND change_date >= $${++paramCount}`;
    }
    
    if (endDate) {
      params.push(endDate);
      query += ` AND change_date <= $${++paramCount}`;
    }
    
    // Get total count
    const countResult = await pool.query(
      query.replace('SELECT *', 'SELECT COUNT(*)'),
      params
    );
    
    // Get paginated results
    params.push(limit);
    params.push(offset);
    query += ` ORDER BY change_date DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`;
    
    const result = await pool.query(query, params);
    
    res.json({
      logs: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(countResult.rows[0].count / limit)
    });
  } catch (error) {
    console.error('Audit logs error:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

app.get('/api/audit-logs/stats', verifyToken, async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_actions,
        COUNT(CASE WHEN change_date > NOW() - INTERVAL '24 hours' THEN 1 END) as actions_today,
        COUNT(DISTINCT changed_by) as unique_users,
        (SELECT table_name FROM audit_log GROUP BY table_name ORDER BY COUNT(*) DESC LIMIT 1) as most_active_table
      FROM audit_log
    `);
    
    const actionBreakdown = await pool.query(`
      SELECT action, COUNT(*) as count
      FROM audit_log
      GROUP BY action
      ORDER BY count DESC
    `);
    
    res.json({
      ...stats.rows[0],
      action_breakdown: actionBreakdown.rows
    });
  } catch (error) {
    console.error('Audit stats error:', error);
    res.status(500).json({ error: 'Failed to fetch audit stats' });
  }
});

// Health check
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'healthy', timestamp: new Date() });
  } catch (error) {
    res.status(500).json({ status: 'unhealthy', error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing server...');
  await pool.end();
  process.exit(0);
});