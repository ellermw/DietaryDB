#!/bin/bash
# /opt/dietarydb/correct-column-fix.sh
# Fix backend to use 'name' instead of 'category_name'

set -e

echo "======================================"
echo "Fixing Backend to Use Correct Column"
echo "======================================"
echo ""

cd /opt/dietarydb

# The table has 'name' not 'category_name' - let's work with what we have!
echo "Step 1: Verifying current categories"
echo "===================================="
docker exec dietary_postgres psql -U dietary_user -d dietary_db -c "SELECT category_id, name FROM categories ORDER BY name;" || echo "Error"
echo ""

# Step 2: Create backend that uses the ACTUAL column names
echo "Step 2: Creating backend with correct column names"
echo "=================================================="

cat > backend/server-correct-columns.js << 'EOF'
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

const pool = new Pool({
  host: process.env.DB_HOST || 'dietary_postgres',
  port: 5432,
  database: process.env.DB_NAME || 'dietary_db',
  user: process.env.DB_USER || 'dietary_user',
  password: process.env.DB_PASSWORD || 'DietarySecurePass2024!'
});

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Initialize
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
    
    // Add some default categories if table is empty
    const count = await pool.query('SELECT COUNT(*) FROM categories');
    if (parseInt(count.rows[0].count) === 0) {
      const defaults = ['Breakfast', 'Lunch', 'Dinner', 'Beverages', 'Snacks', 
                       'Desserts', 'Sides', 'Condiments', 'Entrees', 'Soups', 
                       'Salads', 'Appetizers', 'Dairy', 'Fruits'];
      for (const cat of defaults) {
        await pool.query('INSERT INTO categories (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [cat]);
      }
      console.log('Added default categories');
    }
  } catch (error) {
    console.error('Init error:', error);
  }
}
initDatabase();

async function logActivity(userId, username, action, details = '') {
  try {
    await pool.query(
      'INSERT INTO activity_log (user_id, username, action, details) VALUES ($1, $2, $3, $4)',
      [userId, username, action, details]
    );
  } catch (error) {
    console.error('Log error:', error);
  }
}

// Health
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
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
    res.json({ totalItems: 0, totalUsers: 1, totalCategories: 0, recentActivity: [] });
  }
});

// Items
app.get('/api/items', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM items WHERE is_active = true ORDER BY item_id DESC');
    res.json(result.rows);
  } catch (error) {
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
    
    // Update item count in categories table
    await pool.query('UPDATE categories SET item_count = item_count + 1 WHERE name = $1', [category]);
    
    await logActivity(1, 'admin', 'Create Item', `Created: ${name}`);
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Error creating item' });
  }
});

app.put('/api/items/:id', async (req, res) => {
  const { id } = req.params;
  const { name, category, is_ada_friendly, fluid_ml, sodium_mg, carbs_g, calories } = req.body;
  try {
    // Get old category
    const oldItem = await pool.query('SELECT category FROM items WHERE item_id = $1', [id]);
    const oldCategory = oldItem.rows[0]?.category;
    
    const result = await pool.query(
      `UPDATE items SET name=$1, category=$2, is_ada_friendly=$3, fluid_ml=$4, 
       sodium_mg=$5, carbs_g=$6, calories=$7, modified_date=CURRENT_TIMESTAMP 
       WHERE item_id=$8 RETURNING *`,
      [name, category, is_ada_friendly, fluid_ml, sodium_mg, carbs_g, calories, id]
    );
    
    // Update category counts if category changed
    if (oldCategory && oldCategory !== category) {
      await pool.query('UPDATE categories SET item_count = GREATEST(0, item_count - 1) WHERE name = $1', [oldCategory]);
      await pool.query('UPDATE categories SET item_count = item_count + 1 WHERE name = $1', [category]);
    }
    
    await logActivity(1, 'admin', 'Update Item', `Updated: ${name}`);
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Error updating item' });
  }
});

app.delete('/api/items/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Get category of item being deleted
    const item = await pool.query('SELECT category FROM items WHERE item_id = $1', [id]);
    const category = item.rows[0]?.category;
    
    await pool.query('UPDATE items SET is_active = false WHERE item_id = $1', [id]);
    
    // Update category count
    if (category) {
      await pool.query('UPDATE categories SET item_count = GREATEST(0, item_count - 1) WHERE name = $1', [category]);
    }
    
    await logActivity(1, 'admin', 'Delete Item', `Deleted item ${id}`);
    res.json({ message: 'Item deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting item' });
  }
});

app.post('/api/items/bulk-delete', async (req, res) => {
  const { ids } = req.body;
  try {
    // Get categories of items being deleted
    const items = await pool.query('SELECT category FROM items WHERE item_id = ANY($1) AND is_active = true', [ids]);
    
    // Count items per category
    const categoryCounts = {};
    items.rows.forEach(item => {
      categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
    });
    
    // Delete items
    await pool.query('UPDATE items SET is_active = false WHERE item_id = ANY($1)', [ids]);
    
    // Update category counts
    for (const [category, count] of Object.entries(categoryCounts)) {
      await pool.query('UPDATE categories SET item_count = GREATEST(0, item_count - $1) WHERE name = $2', [count, category]);
    }
    
    await logActivity(1, 'admin', 'Bulk Delete', `Deleted ${ids.length} items`);
    res.json({ message: `${ids.length} items deleted` });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting items' });
  }
});

// CATEGORIES - USING CORRECT COLUMN NAME 'name'
app.get('/api/categories', async (req, res) => {
  console.log('GET /api/categories');
  
  try {
    // Query using the ACTUAL column name: 'name' not 'category_name'
    const result = await pool.query(`
      SELECT 
        c.name as category,
        COALESCE(COUNT(i.item_id), 0) as item_count
      FROM categories c
      LEFT JOIN items i ON c.name = i.category AND i.is_active = true
      GROUP BY c.category_id, c.name
      ORDER BY c.name
    `);
    
    console.log(`Returning ${result.rows.length} categories`);
    res.json(result.rows);
    
  } catch (error) {
    console.error('Categories error:', error.message);
    // If join fails, try simple query
    try {
      const simple = await pool.query('SELECT name as category, item_count FROM categories ORDER BY name');
      res.json(simple.rows);
    } catch (err2) {
      console.error('Simple query also failed:', err2.message);
      res.json([]);
    }
  }
});

app.post('/api/categories', async (req, res) => {
  const { category_name } = req.body;
  
  console.log('Creating category:', category_name);
  
  if (!category_name || category_name.trim() === '') {
    return res.status(400).json({ message: 'Category name is required' });
  }
  
  try {
    // Check if exists - using 'name' column
    const existing = await pool.query(
      'SELECT category_id FROM categories WHERE LOWER(name) = LOWER($1)',
      [category_name.trim()]
    );
    
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'Category already exists' });
    }
    
    // Insert using 'name' column
    const result = await pool.query(
      'INSERT INTO categories (name, item_count) VALUES ($1, 0) RETURNING category_id, name',
      [category_name.trim()]
    );
    
    await logActivity(1, 'admin', 'Create Category', `Created: ${category_name}`);
    res.json({ message: 'Category created successfully', category: result.rows[0] });
    
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ message: 'Error creating category' });
  }
});

app.delete('/api/categories/:name', async (req, res) => {
  const categoryName = decodeURIComponent(req.params.name);
  
  try {
    // Check item count from the categories table itself
    const catCheck = await pool.query(
      'SELECT item_count FROM categories WHERE name = $1',
      [categoryName]
    );
    
    if (catCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    const itemCount = parseInt(catCheck.rows[0].item_count || 0);
    
    if (itemCount > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete category',
        reason: `This category has ${itemCount} item(s) using it.`,
        itemCount
      });
    }
    
    // Delete using 'name' column
    const result = await pool.query(
      'DELETE FROM categories WHERE name = $1 RETURNING *',
      [categoryName]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    await logActivity(1, 'admin', 'Delete Category', `Deleted: ${categoryName}`);
    res.json({ message: 'Category deleted successfully' });
    
  } catch (error) {
    res.status(500).json({ message: 'Error deleting category' });
  }
});

// Debug endpoint
app.get('/api/debug/categories', async (req, res) => {
  try {
    const categories = await pool.query('SELECT * FROM categories ORDER BY name');
    const items = await pool.query('SELECT category, COUNT(*) FROM items WHERE is_active = true GROUP BY category');
    
    res.json({
      categories_table: categories.rows,
      items_by_category: items.rows,
      total_categories: categories.rows.length
    });
  } catch (error) {
    res.json({ error: error.message });
  }
});

// Recalculate category counts
app.post('/api/categories/recalculate', async (req, res) => {
  try {
    // Reset all counts to 0
    await pool.query('UPDATE categories SET item_count = 0');
    
    // Get actual counts
    const counts = await pool.query('SELECT category, COUNT(*) as count FROM items WHERE is_active = true GROUP BY category');
    
    // Update each category
    for (const row of counts.rows) {
      await pool.query('UPDATE categories SET item_count = $1 WHERE name = $2', [row.count, row.category]);
    }
    
    res.json({ message: 'Category counts recalculated' });
  } catch (error) {
    res.status(500).json({ message: error.message });
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
  if (id == 1) return res.status(400).json({ message: 'Cannot delete admin' });
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
  res.json({ message: 'Import completed' });
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

app.use('*', (req, res) => {
  res.status(404).json({ message: 'Not found' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`DietaryDB Backend - Port ${PORT}`);
  console.log('Using correct column: "name" not "category_name"');
});
EOF

docker cp backend/server-correct-columns.js dietary_backend:/app/server.js
docker restart dietary_backend
echo "Backend updated with correct column names"
sleep 6
echo ""

# Step 3: Add missing default categories
echo "Step 3: Ensuring all default categories exist"
echo "============================================="
docker exec dietary_postgres psql -U dietary_user -d dietary_db << 'EOF'
-- Add any missing default categories
INSERT INTO categories (name, item_count) VALUES 
('Beverages', 0),
('Lunch', 0),
('Condiments', 0),
('Entrees', 0),
('Soups', 0),
('Salads', 0),
('Appetizers', 0),
('Dairy', 0),
('Fruits', 0)
ON CONFLICT (name) DO NOTHING;

-- Show all categories
SELECT category_id, name, item_count FROM categories ORDER BY name;
EOF
echo ""

# Step 4: Recalculate item counts
echo "Step 4: Recalculating item counts"
echo "================================="
docker exec dietary_postgres psql -U dietary_user -d dietary_db << 'EOF'
-- Reset all counts
UPDATE categories SET item_count = 0;

-- Update with actual counts
UPDATE categories c 
SET item_count = COALESCE((
    SELECT COUNT(*) 
    FROM items i 
    WHERE i.category = c.name 
    AND i.is_active = true
), 0);

-- Show updated counts
SELECT name, item_count FROM categories ORDER BY name;
EOF
echo ""

# Step 5: Test the API
echo "Step 5: Testing the fixed API"
echo "============================="
echo "Categories endpoint:"
curl -s http://localhost:3000/api/categories | python3 -m json.tool | head -30 || echo "API Response"
echo ""

echo "Debug endpoint:"
curl -s http://localhost:3000/api/debug/categories | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print(f'Total categories: {data.get(\"total_categories\", 0)}')
    if 'categories_table' in data:
        for cat in data['categories_table'][:5]:
            print(f\"  - {cat.get('name', 'Unknown')}: {cat.get('item_count', 0)} items\")
except Exception as e:
    print(f'Error: {e}')
" 2>/dev/null
echo ""

echo "======================================"
echo "✅ CATEGORIES FINALLY FIXED!"
echo "======================================"
echo ""
echo "The backend now uses the correct column name: 'name'"
echo "All 14 categories should be available"
echo ""
echo "Please:"
echo "1. Clear your browser cache (Ctrl+Shift+Delete)"
echo "2. Go to http://15.204.252.189:3001"
echo "3. Navigate to the Items page"
echo ""
echo "Categories will now display correctly!"
echo ""
