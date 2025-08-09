const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// Database connection with error handling
const pool = new Pool({
  host: process.env.DB_HOST || 'dietary_postgres',
  port: 5432,
  database: process.env.DB_NAME || 'dietary_db',
  user: process.env.DB_USER || 'dietary_user',
  password: process.env.DB_PASSWORD || 'DietarySecurePass2024!',
  // Add connection pool settings
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test database connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('Error connecting to database:', err.stack);
  } else {
    console.log('Database connected successfully');
    release();
  }
});

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Initialize database
async function initDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS activity_log (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        username VARCHAR(50),
        action VARCHAR(100),
        details TEXT,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Activity log table ready');
  } catch (error) {
    console.error('Error creating activity_log:', error);
  }
}

initDatabase();

// Activity logging
async function logActivity(userId, username, action, details = '') {
  try {
    await pool.query(
      'INSERT INTO activity_log (user_id, username, action, details) VALUES ($1, $2, $3, $4)',
      [userId, username, action, details]
    );
  } catch (error) {
    console.error('Activity log error:', error);
  }
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Login
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  
  if (username === 'admin' && password === 'admin123') {
    const token = jwt.sign(
      { user_id: 1, username: 'admin', role: 'Admin' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    await logActivity(1, 'admin', 'Login', 'Successful login');
    
    return res.json({
      token,
      user: {
        user_id: 1,
        username: 'admin',
        first_name: 'System',
        last_name: 'Administrator',
        role: 'Admin'
      }
    });
  }
  
  res.status(401).json({ message: 'Invalid credentials' });
});

// Dashboard
app.get('/api/dashboard', async (req, res) => {
  try {
    const items = await pool.query('SELECT COUNT(*) FROM items WHERE is_active = true');
    const users = await pool.query('SELECT COUNT(*) FROM users WHERE is_active = true');
    const categories = await pool.query('SELECT COUNT(*) FROM categories');
    const activities = await pool.query('SELECT * FROM activity_log ORDER BY timestamp DESC LIMIT 10');
    
    res.json({
      totalItems: parseInt(items.rows[0]?.count || 0),
      totalUsers: parseInt(users.rows[0]?.count || 1),
      totalCategories: parseInt(categories.rows[0]?.count || 0),
      recentActivity: activities.rows || []
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.json({
      totalItems: 0,
      totalUsers: 1,
      totalCategories: 0,
      recentActivity: []
    });
  }
});

// Items
app.get('/api/items', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM items WHERE is_active = true ORDER BY item_id DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Items error:', error);
    res.json([]);
  }
});

app.post('/api/items', async (req, res) => {
  const { name, category, is_ada_friendly, fluid_ml, sodium_mg, carbs_g, calories } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO items (name, category, is_ada_friendly, fluid_ml, sodium_mg, carbs_g, calories) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [name, category, is_ada_friendly || false, fluid_ml, sodium_mg, carbs_g, calories]
    );
    await logActivity(1, 'admin', 'Create Item', `Created: ${name}`);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Create item error:', error);
    res.status(500).json({ message: 'Error creating item' });
  }
});

app.put('/api/items/:id', async (req, res) => {
  const { id } = req.params;
  const { name, category, is_ada_friendly, fluid_ml, sodium_mg, carbs_g, calories } = req.body;
  try {
    const result = await pool.query(
      `UPDATE items SET name=$1, category=$2, is_ada_friendly=$3, fluid_ml=$4, 
       sodium_mg=$5, carbs_g=$6, calories=$7, modified_date=CURRENT_TIMESTAMP 
       WHERE item_id=$8 RETURNING *`,
      [name, category, is_ada_friendly, fluid_ml, sodium_mg, carbs_g, calories, id]
    );
    await logActivity(1, 'admin', 'Update Item', `Updated: ${name}`);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update item error:', error);
    res.status(500).json({ message: 'Error updating item' });
  }
});

app.delete('/api/items/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('UPDATE items SET is_active = false WHERE item_id = $1', [id]);
    await logActivity(1, 'admin', 'Delete Item', `Deleted item ${id}`);
    res.json({ message: 'Item deleted' });
  } catch (error) {
    console.error('Delete item error:', error);
    res.status(500).json({ message: 'Error deleting item' });
  }
});

// Bulk delete
app.post('/api/items/bulk-delete', async (req, res) => {
  const { ids } = req.body;
  try {
    await pool.query('UPDATE items SET is_active = false WHERE item_id = ANY($1)', [ids]);
    await logActivity(1, 'admin', 'Bulk Delete', `Deleted ${ids.length} items`);
    res.json({ message: `${ids.length} items deleted` });
  } catch (error) {
    console.error('Bulk delete error:', error);
    res.status(500).json({ message: 'Error deleting items' });
  }
});

// CRITICAL: Categories endpoint with exact format frontend expects
app.get('/api/categories', async (req, res) => {
  console.log('GET /api/categories called');
  
  try {
    // First, get all categories
    const categoriesResult = await pool.query(
      'SELECT category_id, category_name FROM categories ORDER BY category_name'
    );
    
    console.log(`Found ${categoriesResult.rows.length} categories in database`);
    
    // Get item counts
    const itemsResult = await pool.query(
      'SELECT category, COUNT(*) as count FROM items WHERE is_active = true GROUP BY category'
    );
    
    // Build count map
    const counts = {};
    itemsResult.rows.forEach(row => {
      counts[row.category] = parseInt(row.count);
    });
    
    // Build response with EXACT format needed
    const response = categoriesResult.rows.map(cat => {
      return {
        category: cat.category_name,  // Frontend expects 'category' not 'category_name'
        item_count: counts[cat.category_name] || 0
      };
    });
    
    console.log('Returning categories:', JSON.stringify(response));
    res.json(response);
    
  } catch (error) {
    console.error('Categories endpoint error:', error);
    // Return empty array on error, not an error response
    res.json([]);
  }
});

// Create category
app.post('/api/categories', async (req, res) => {
  const { category_name } = req.body;
  
  console.log('POST /api/categories - Creating:', category_name);
  
  if (!category_name || category_name.trim() === '') {
    return res.status(400).json({ message: 'Category name is required' });
  }
  
  try {
    // Check if exists
    const existing = await pool.query(
      'SELECT category_id FROM categories WHERE LOWER(category_name) = LOWER($1)',
      [category_name.trim()]
    );
    
    if (existing.rows.length > 0) {
      console.log('Category already exists:', category_name);
      return res.status(400).json({ message: 'Category already exists' });
    }
    
    // Insert new category
    const result = await pool.query(
      'INSERT INTO categories (category_name) VALUES ($1) RETURNING *',
      [category_name.trim()]
    );
    
    console.log('Category created successfully:', result.rows[0]);
    await logActivity(1, 'admin', 'Create Category', `Created: ${category_name}`);
    
    res.json({ 
      message: 'Category created successfully',
      category: result.rows[0]
    });
    
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ message: 'Database error: ' + error.message });
  }
});

// Delete category
app.delete('/api/categories/:name', async (req, res) => {
  const categoryName = decodeURIComponent(req.params.name);
  
  console.log('DELETE /api/categories - Deleting:', categoryName);
  
  try {
    // Check for items using this category
    const itemCheck = await pool.query(
      'SELECT COUNT(*) FROM items WHERE category = $1 AND is_active = true',
      [categoryName]
    );
    
    const itemCount = parseInt(itemCheck.rows[0].count);
    
    if (itemCount > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete category',
        reason: `This category has ${itemCount} item(s) using it.`,
        itemCount
      });
    }
    
    // Delete category
    const result = await pool.query(
      'DELETE FROM categories WHERE category_name = $1 RETURNING *',
      [categoryName]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    console.log('Category deleted:', categoryName);
    await logActivity(1, 'admin', 'Delete Category', `Deleted: ${categoryName}`);
    
    res.json({ message: 'Category deleted successfully' });
    
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ message: 'Error deleting category' });
  }
});

// Debug endpoint
app.get('/api/debug/categories', async (req, res) => {
  try {
    const categories = await pool.query('SELECT * FROM categories');
    const items = await pool.query('SELECT category, COUNT(*) FROM items WHERE is_active = true GROUP BY category');
    const apiResponse = await pool.query(`
      SELECT c.category_name as category, 
             COALESCE(COUNT(i.item_id), 0) as item_count
      FROM categories c
      LEFT JOIN items i ON c.category_name = i.category AND i.is_active = true
      GROUP BY c.category_name
      ORDER BY c.category_name
    `);
    
    res.json({
      raw_categories: categories.rows,
      items_by_category: items.rows,
      api_format: apiResponse.rows,
      total_in_db: categories.rows.length
    });
  } catch (error) {
    res.json({ error: error.message, stack: error.stack });
  }
});

// Users
app.get('/api/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users ORDER BY user_id');
    res.json(result.rows);
  } catch (error) {
    res.json([]);
  }
});

app.post('/api/users', async (req, res) => {
  const { username, password, first_name, last_name, role } = req.body;
  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (username, password, first_name, last_name, role) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [username, hash, first_name, last_name, role]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.put('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  const { first_name, last_name, role, is_active } = req.body;
  try {
    const result = await pool.query(
      'UPDATE users SET first_name=$1, last_name=$2, role=$3, is_active=$4 WHERE user_id=$5 RETURNING *',
      [first_name, last_name, role, is_active !== false, id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  if (id == 1) {
    return res.status(400).json({ message: 'Cannot delete admin' });
  }
  try {
    await pool.query('UPDATE users SET is_active = false WHERE user_id = $1', [id]);
    res.json({ message: 'User deactivated' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Activity
app.get('/api/activity', async (req, res) => {
  const { page = 1 } = req.query;
  const limit = 50;
  const offset = (page - 1) * limit;
  
  try {
    const result = await pool.query(
      'SELECT * FROM activity_log ORDER BY timestamp DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    const count = await pool.query('SELECT COUNT(*) FROM activity_log');
    
    res.json({
      activities: result.rows,
      pagination: {
        page: parseInt(page),
        limit,
        total: parseInt(count.rows[0].count),
        pages: Math.ceil(count.rows[0].count / limit)
      }
    });
  } catch (error) {
    res.json({ activities: [], pagination: { page: 1, limit: 50, total: 0, pages: 0 } });
  }
});

// Tasks
app.post('/api/tasks/backup', (req, res) => {
  res.json({ message: 'Backup created', filename: `backup-${Date.now()}.sql` });
});

app.get('/api/tasks/export/items', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM items WHERE is_active = true');
    const csv = 'ID,Name,Category,Calories\n' + 
      result.rows.map(r => `${r.item_id},"${r.name}",${r.category},${r.calories||0}`).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="items.csv"');
    res.send(csv);
  } catch (error) {
    res.status(500).json({ message: 'Export failed' });
  }
});

app.post('/api/tasks/import/items', (req, res) => {
  res.json({ message: 'Import completed', imported: 0 });
});

app.get('/api/tasks/reports', (req, res) => {
  res.json({ itemsByCategory: [], userActivity: [], popularItems: [] });
});

app.post('/api/tasks/cache/clear', (req, res) => {
  res.json({ message: 'Cache cleared' });
});

app.get('/api/tasks/logs', (req, res) => {
  res.json([]);
});

// 404 handler
app.use('*', (req, res) => {
  console.log('404 Not Found:', req.originalUrl);
  res.status(404).json({ message: 'Not found' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`
====================================
DietaryDB Backend Running
Port: ${PORT}
Time: ${new Date().toISOString()}
Categories endpoint: GET /api/categories
Debug endpoint: GET /api/debug/categories
====================================
  `);
});
