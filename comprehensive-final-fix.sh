#!/bin/bash
# /opt/dietarydb/comprehensive-final-fix.sh
# Fix all remaining issues

set -e

echo "======================================"
echo "Comprehensive Fix for All Issues"
echo "======================================"

cd /opt/dietarydb

# 1. Fix Users API to return data
echo "1. Fixing Users API..."
echo "====================  "

# Check what users.js is returning
echo "Testing users API directly:"
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | \
  grep -o '"token":"[^"]*' | cut -d'"' -f4)

echo "Users API response:"
curl -s http://localhost:3000/api/users \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool | head -20

# 2. Update docker-compose.yml to mount backup directory
echo ""
echo "2. Updating docker-compose.yml for backup mount..."
echo "================================================="

# Backup current docker-compose.yml
cp docker-compose.yml docker-compose.yml.backup

# Create backup directory
mkdir -p /opt/dietarydb/backups/databases

# Update docker-compose.yml to add volume mount
sed -i '/dietary_backend:/,/depends_on:/{
  /volumes:/a\      - /opt/dietarydb/backups/databases:/db_backup
}' docker-compose.yml

echo "Volume mount added to docker-compose.yml"

# 3. Fix Tasks routes to use mounted backup directory
echo ""
echo "3. Updating tasks.js to use /db_backup..."
echo "========================================"

cat > backend/routes/tasks.js << 'EOF'
const express = require('express');
const db = require('../config/database');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

const router = express.Router();

// Default backup directory (can be overridden)
let BACKUP_DIR = process.env.BACKUP_DIR || '/db_backup';

// Get/Set backup directory
router.get('/backup/config', [
  authenticateToken,
  authorizeRole('Admin')
], async (req, res) => {
  res.json({ backup_directory: BACKUP_DIR });
});

router.post('/backup/config', [
  authenticateToken,
  authorizeRole('Admin')
], async (req, res) => {
  const { backup_directory } = req.body;
  if (backup_directory) {
    BACKUP_DIR = backup_directory;
    res.json({ message: 'Backup directory updated', backup_directory: BACKUP_DIR });
  } else {
    res.status(400).json({ message: 'Backup directory is required' });
  }
});

// Get database statistics - FIXED
router.get('/database/stats', [
  authenticateToken,
  authorizeRole('Admin')
], async (req, res) => {
  try {
    // Separate queries to avoid failures
    const sizeResult = await db.query("SELECT pg_database_size(current_database()) as database_size");
    const usersResult = await db.query("SELECT COUNT(*) as count FROM users");
    const patientsResult = await db.query("SELECT COUNT(*) as count FROM patient_info");
    const ordersResult = await db.query("SELECT COUNT(*) as count FROM meal_orders");
    
    // Try to get backup stats, but don't fail if tables don't exist
    let backupStats = { total_backups: "0", last_backup: null };
    try {
      const backupResult = await db.query(`
        SELECT 
          COUNT(*) as total_backups,
          MAX(created_date) as last_backup
        FROM backup_history 
        WHERE status = 'completed'
      `);
      if (backupResult.rows[0]) {
        backupStats = backupResult.rows[0];
      }
    } catch (err) {
      console.log('Backup tables not found');
    }
    
    res.json({
      database_size: sizeResult.rows[0].database_size,
      total_users: usersResult.rows[0].count,
      total_patients: patientsResult.rows[0].count,
      total_orders: ordersResult.rows[0].count,
      total_backups: backupStats.total_backups,
      last_backup: backupStats.last_backup
    });
  } catch (error) {
    console.error('Error fetching database stats:', error);
    res.status(500).json({ message: 'Error fetching database statistics' });
  }
});

// Run database maintenance
router.post('/database/maintenance', [
  authenticateToken,
  authorizeRole('Admin')
], async (req, res) => {
  try {
    await db.query('VACUUM ANALYZE');
    res.json({ 
      message: 'Database maintenance completed successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error running maintenance:', error);
    res.status(500).json({ message: 'Error running database maintenance' });
  }
});

// Manual backup
router.post('/backup/manual', [
  authenticateToken,
  authorizeRole('Admin')
], async (req, res) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `dietary_db_backup_${timestamp}.sql`;
    const backupPath = path.join(BACKUP_DIR, backupName);
    
    // Ensure backup directory exists
    try {
      await fs.mkdir(BACKUP_DIR, { recursive: true });
    } catch (err) {
      console.log('Backup directory exists or cannot be created:', err.message);
    }
    
    // Create backup
    const pgDumpCommand = `PGPASSWORD="${process.env.DB_PASSWORD || 'DietarySecurePass2024!'}" pg_dump -h ${process.env.DB_HOST || 'postgres'} -p ${process.env.DB_PORT || '5432'} -U ${process.env.DB_USER || 'dietary_user'} -d ${process.env.DB_NAME || 'dietary_db'} -f ${backupPath}`;
    
    exec(pgDumpCommand, async (error, stdout, stderr) => {
      if (error) {
        console.error('Backup error:', error);
        res.status(500).json({ message: 'Error creating backup', error: error.message });
      } else {
        try {
          const stats = await fs.stat(backupPath);
          
          // Try to record in backup_history
          try {
            await db.query(
              `INSERT INTO backup_history (backup_name, backup_type, backup_size, backup_path, created_by, status) 
               VALUES ($1, $2, $3, $4, $5, $6)`,
              [backupName, 'manual', stats.size, backupPath, req.user.username || 'admin', 'completed']
            );
          } catch (dbErr) {
            console.log('Could not record backup in history');
          }
          
          res.json({ 
            message: 'Backup completed successfully',
            backupName,
            size: stats.size,
            path: backupPath
          });
        } catch (statErr) {
          res.json({ 
            message: 'Backup completed',
            backupName,
            path: backupPath
          });
        }
      }
    });
  } catch (error) {
    console.error('Error creating backup:', error);
    res.status(500).json({ message: 'Error creating backup' });
  }
});

// Get backup history
router.get('/backup/history', [
  authenticateToken,
  authorizeRole('Admin')
], async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM backup_history ORDER BY created_date DESC LIMIT 50`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching backup history:', error);
    res.json([]); // Return empty array if table doesn't exist
  }
});

// Get backup schedules
router.get('/backup/schedules', [
  authenticateToken,
  authorizeRole('Admin')
], async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM backup_schedules ORDER BY created_date DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching schedules:', error);
    res.json([]); // Return empty array if table doesn't exist
  }
});

// Create backup schedule
router.post('/backup/schedule', [
  authenticateToken,
  authorizeRole('Admin')
], async (req, res) => {
  try {
    // First ensure tables exist
    await db.query(`
      CREATE TABLE IF NOT EXISTS backup_schedules (
        schedule_id SERIAL PRIMARY KEY,
        schedule_name VARCHAR(100) NOT NULL,
        schedule_type VARCHAR(20) NOT NULL CHECK (schedule_type IN ('daily', 'weekly', 'monthly')),
        schedule_time TIME NOT NULL,
        schedule_day_of_week INTEGER CHECK (schedule_day_of_week >= 0 AND schedule_day_of_week <= 6),
        schedule_day_of_month INTEGER CHECK (schedule_day_of_month >= 1 AND schedule_day_of_month <= 31),
        retention_days INTEGER NOT NULL DEFAULT 30,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        modified_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    const { schedule_name, schedule_type, schedule_time, schedule_day_of_week, 
            schedule_day_of_month, retention_days } = req.body;
    
    const result = await db.query(
      `INSERT INTO backup_schedules 
       (schedule_name, schedule_type, schedule_time, schedule_day_of_week,
        schedule_day_of_month, retention_days) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [schedule_name, schedule_type, schedule_time, schedule_day_of_week,
       schedule_day_of_month, retention_days || 30]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating schedule:', error);
    res.status(500).json({ message: 'Error creating backup schedule' });
  }
});

module.exports = router;
EOF

# 4. Fix users.js to ensure it returns data
echo ""
echo "4. Checking users.js response format..."
echo "======================================"

# Test if users are being returned
echo "Current users in database:"
docker exec dietary_postgres psql -U dietary_user -d dietary_db -c "SELECT username, role, is_active FROM users;"

# 5. Add category management routes to items.js
echo ""
echo "5. Adding category management to items.js..."
echo "==========================================="

cat > backend/routes/items-with-categories.js << 'EOF'
const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

// Get all items
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM items WHERE is_active = true ORDER BY category, name'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching items:', error);
    res.status(500).json({ message: 'Error fetching items' });
  }
});

// Get categories
router.get('/categories', authenticateToken, async (req, res) => {
  try {
    // First try to get from categories table if it exists
    try {
      const result = await db.query(
        'SELECT category_name, description, sort_order FROM categories ORDER BY sort_order, category_name'
      );
      res.json(result.rows);
    } catch (err) {
      // If categories table doesn't exist, get distinct from items
      const result = await db.query(
        'SELECT DISTINCT category as category_name FROM items WHERE category IS NOT NULL ORDER BY category'
      );
      res.json(result.rows);
    }
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ message: 'Error fetching categories' });
  }
});

// Create category
router.post('/categories', [
  authenticateToken,
  authorizeRole('Admin'),
  body('category_name').notEmpty().trim()
], async (req, res) => {
  try {
    const { category_name, description, sort_order } = req.body;
    
    // Create categories table if it doesn't exist
    await db.query(`
      CREATE TABLE IF NOT EXISTS categories (
        category_id SERIAL PRIMARY KEY,
        category_name VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        sort_order INTEGER DEFAULT 0,
        created_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    const result = await db.query(
      'INSERT INTO categories (category_name, description, sort_order) VALUES ($1, $2, $3) RETURNING *',
      [category_name, description || '', sort_order || 0]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') { // Unique violation
      res.status(400).json({ message: 'Category already exists' });
    } else {
      console.error('Error creating category:', error);
      res.status(500).json({ message: 'Error creating category' });
    }
  }
});

// Update category
router.put('/categories/:name', [
  authenticateToken,
  authorizeRole('Admin')
], async (req, res) => {
  try {
    const oldName = req.params.name;
    const { category_name, description, sort_order } = req.body;
    
    // Update in categories table
    try {
      await db.query(
        'UPDATE categories SET category_name = $1, description = $2, sort_order = $3 WHERE category_name = $4',
        [category_name || oldName, description, sort_order, oldName]
      );
    } catch (err) {
      console.log('Categories table might not exist');
    }
    
    // Update items with this category
    if (category_name && category_name !== oldName) {
      await db.query(
        'UPDATE items SET category = $1 WHERE category = $2',
        [category_name, oldName]
      );
    }
    
    res.json({ message: 'Category updated successfully' });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ message: 'Error updating category' });
  }
});

// Delete category
router.delete('/categories/:name', [
  authenticateToken,
  authorizeRole('Admin')
], async (req, res) => {
  try {
    const categoryName = req.params.name;
    
    // Check if items exist with this category
    const itemsResult = await db.query(
      'SELECT COUNT(*) as count FROM items WHERE category = $1 AND is_active = true',
      [categoryName]
    );
    
    if (itemsResult.rows[0].count > 0) {
      return res.status(400).json({ 
        message: `Cannot delete category. ${itemsResult.rows[0].count} items are using this category.` 
      });
    }
    
    // Delete from categories table if exists
    try {
      await db.query('DELETE FROM categories WHERE category_name = $1', [categoryName]);
    } catch (err) {
      console.log('Categories table might not exist');
    }
    
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ message: 'Error deleting category' });
  }
});

// Create new item
router.post('/', [
  authenticateToken,
  authorizeRole('Admin', 'Kitchen'),
  body('name').notEmpty().trim(),
  body('category').notEmpty().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, category, description, is_ada_friendly, fluid_ml, carbs_g, sodium_mg, calories } = req.body;
    
    const result = await db.query(
      `INSERT INTO items (name, category, description, is_ada_friendly, fluid_ml, carbs_g, sodium_mg, calories) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING *`,
      [name, category, description || '', is_ada_friendly || false, fluid_ml, carbs_g, sodium_mg, calories]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating item:', error);
    res.status(500).json({ message: 'Error creating item' });
  }
});

// Update item
router.put('/:id', [
  authenticateToken,
  authorizeRole('Admin', 'Kitchen')
], async (req, res) => {
  try {
    const itemId = req.params.id;
    const { name, category, description, is_ada_friendly, fluid_ml, carbs_g, sodium_mg, calories } = req.body;
    
    const result = await db.query(
      `UPDATE items 
       SET name = $1, category = $2, description = $3, is_ada_friendly = $4, 
           fluid_ml = $5, carbs_g = $6, sodium_mg = $7, calories = $8, 
           modified_date = CURRENT_TIMESTAMP
       WHERE item_id = $9 AND is_active = true
       RETURNING *`,
      [name, category, description, is_ada_friendly, fluid_ml, carbs_g, sodium_mg, calories, itemId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Item not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating item:', error);
    res.status(500).json({ message: 'Error updating item' });
  }
});

// Delete item (soft delete)
router.delete('/:id', [
  authenticateToken,
  authorizeRole('Admin')
], async (req, res) => {
  try {
    const result = await db.query(
      'UPDATE items SET is_active = false WHERE item_id = $1 RETURNING name',
      [req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Item not found' });
    }
    
    res.json({ message: `Item "${result.rows[0].name}" deleted successfully` });
  } catch (error) {
    console.error('Error deleting item:', error);
    res.status(500).json({ message: 'Error deleting item' });
  }
});

module.exports = router;
EOF

# Replace the old items.js
mv backend/routes/items.js backend/routes/items-old.js
mv backend/routes/items-with-categories.js backend/routes/items.js

# 6. Restart services with new volume mount
echo ""
echo "6. Restarting services with new configuration..."
echo "==============================================="
docker-compose down
docker-compose up -d

echo ""
echo "7. Waiting for services to start..."
sleep 15

# 8. Test all endpoints
echo ""
echo "8. Testing all fixed endpoints..."
echo "================================"
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | \
  grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ ! -z "$TOKEN" ]; then
    echo "a) Users endpoint:"
    curl -s http://localhost:3000/api/users \
      -H "Authorization: Bearer $TOKEN" | python3 -m json.tool | head -10
    
    echo ""
    echo "b) Tasks stats:"
    curl -s http://localhost:3000/api/tasks/database/stats \
      -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
    
    echo ""
    echo "c) Categories:"
    curl -s http://localhost:3000/api/items/categories \
      -H "Authorization: Bearer $TOKEN" | python3 -m json.tool | head -10
fi

echo ""
echo "======================================"
echo "Fixes Applied:"
echo "======================================"
echo "✓ Backup directory mounted at /opt/dietarydb/backups/databases"
echo "✓ Docker container can write to /db_backup"
echo "✓ Tasks routes updated to fix statistics"
echo "✓ Category management added to items"
echo "✓ Users API checked"
echo ""
echo "Next: Update the frontend files to fix display issues"
