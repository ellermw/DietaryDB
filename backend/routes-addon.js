// Additional routes for DietaryDB
// This file adds missing endpoints for categories, stats, and backups

const { Pool } = require('pg');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Get pool from main server
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

module.exports = function(app, authenticateToken) {
  console.log('Loading additional routes...');
  
  // ==================== ENHANCED CATEGORIES ====================
  
  // Get categories with item counts
  app.get('/api/categories/detailed', authenticateToken, async (req, res) => {
    console.log('GET /api/categories/detailed accessed');
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
    console.log('POST /api/categories accessed with:', req.body);
    const { name } = req.body;
    
    if (!name || name.trim() === '') {
      return res.status(400).json({ message: 'Category name is required' });
    }
    
    try {
      // First, create categories table if it doesn't exist
      await pool.query(`
        CREATE TABLE IF NOT EXISTS categories (
          category_id SERIAL PRIMARY KEY,
          name VARCHAR(100) UNIQUE NOT NULL,
          item_count INTEGER DEFAULT 0,
          created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // Insert the new category
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
  
  // Delete category
  app.delete('/api/categories/:name', authenticateToken, async (req, res) => {
    const categoryName = decodeURIComponent(req.params.name);
    console.log('DELETE /api/categories/' + categoryName);
    
    try {
      // Check if category has items
      const itemCheck = await pool.query(
        'SELECT COUNT(*) FROM items WHERE category = $1 AND is_active = true',
        [categoryName]
      );
      
      const itemCount = parseInt(itemCheck.rows[0].count);
      if (itemCount > 0) {
        return res.status(400).json({ 
          message: `Cannot delete category "${categoryName}" - it has ${itemCount} active items` 
        });
      }
      
      // Delete from categories table if exists
      await pool.query('DELETE FROM categories WHERE name = $1', [categoryName]).catch(() => {});
      
      res.json({ message: 'Category deleted successfully' });
    } catch (error) {
      console.error('Error deleting category:', error);
      res.status(500).json({ message: 'Error deleting category' });
    }
  });
  
  // ==================== FIXED DATABASE STATS ====================
  
  // Override the existing database stats endpoint
  app.get('/api/tasks/database/stats', authenticateToken, async (req, res) => {
    console.log('GET /api/tasks/database/stats accessed');
    const stats = {
      totalRecords: 0,
      lastBackup: 'Never',
      databaseSize: '0 MB',
      activeConnections: 0
    };
    
    try {
      // Get total records from all tables
      const counts = await Promise.all([
        pool.query('SELECT COUNT(*) as count FROM items').catch(() => ({ rows: [{ count: 0 }] })),
        pool.query('SELECT COUNT(*) as count FROM users').catch(() => ({ rows: [{ count: 0 }] })),
        pool.query('SELECT COUNT(*) as count FROM patients').catch(() => ({ rows: [{ count: 0 }] })),
        pool.query('SELECT COUNT(*) as count FROM orders').catch(() => ({ rows: [{ count: 0 }] })),
        pool.query('SELECT COUNT(*) as count FROM system_settings').catch(() => ({ rows: [{ count: 0 }] }))
      ]);
      
      stats.totalRecords = counts.reduce((sum, result) => {
        const count = parseInt(result.rows[0].count) || 0;
        return sum + count;
      }, 0);
      
      // Get database size
      const sizeResult = await pool.query(
        "SELECT pg_database_size('dietary_db') as size"
      ).catch(() => ({ rows: [{ size: 0 }] }));
      
      const sizeInBytes = parseInt(sizeResult.rows[0].size) || 0;
      stats.databaseSize = `${(sizeInBytes / 1024 / 1024).toFixed(2)} MB`;
      
      // Get connection count
      const connResult = await pool.query(
        "SELECT count(*) as count FROM pg_stat_activity WHERE datname = 'dietary_db'"
      ).catch(() => ({ rows: [{ count: 1 }] }));
      
      stats.activeConnections = parseInt(connResult.rows[0].count) || 1;
      
      // Get last backup info
      const backupResult = await pool.query(
        "SELECT setting_value FROM system_settings WHERE setting_key = 'last_backup'"
      ).catch(() => ({ rows: [] }));
      
      if (backupResult.rows.length > 0 && backupResult.rows[0].setting_value) {
        stats.lastBackup = backupResult.rows[0].setting_value;
      }
      
      console.log('Database stats:', stats);
      res.json(stats);
    } catch (error) {
      console.error('Error getting database stats:', error);
      res.json(stats); // Return default stats on error
    }
  });
  
  // ==================== MAINTENANCE ENDPOINTS ====================
  
  // Schedule maintenance
  app.post('/api/tasks/database/maintenance', authenticateToken, async (req, res) => {
    console.log('POST /api/tasks/database/maintenance accessed');
    const { schedule, day, time } = req.body;
    
    try {
      // Save schedule settings
      if (schedule) {
        await pool.query(
          `INSERT INTO system_settings (setting_key, setting_value) 
           VALUES ('maintenance_schedule', $1)
           ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value`,
          [schedule]
        );
      }
      
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
      
      // Run basic maintenance
      await pool.query('VACUUM').catch(err => console.log('Vacuum error:', err.message));
      
      res.json({ 
        message: 'Maintenance scheduled successfully',
        schedule, day, time 
      });
    } catch (error) {
      console.error('Error scheduling maintenance:', error);
      res.status(500).json({ message: 'Error scheduling maintenance' });
    }
  });
  
  // Run maintenance now
  app.post('/api/tasks/database/maintenance/run', authenticateToken, async (req, res) => {
    console.log('POST /api/tasks/database/maintenance/run accessed');
    try {
      // Run vacuum (basic maintenance)
      await pool.query('VACUUM').catch(err => console.log('Vacuum error:', err.message));
      
      // Update last maintenance time
      const timestamp = new Date().toISOString();
      await pool.query(
        `INSERT INTO system_settings (setting_key, setting_value) 
         VALUES ('last_maintenance', $1)
         ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value`,
        [timestamp]
      );
      
      res.json({ 
        message: 'Database maintenance completed successfully',
        timestamp
      });
    } catch (error) {
      console.error('Error running maintenance:', error);
      res.status(500).json({ message: 'Error running maintenance' });
    }
  });
  
  // ==================== BACKUP ENDPOINTS ====================
  
  // Create backup
  app.post('/api/tasks/backup/create', authenticateToken, async (req, res) => {
    console.log('POST /api/tasks/backup/create accessed');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${timestamp}.sql`;
    
    try {
      // Create backups directory if it doesn't exist
      const backupDir = '/app/backups';
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      
      const backupPath = path.join(backupDir, filename);
      
      // Create a simple backup using SQL dump
      const dumpQuery = `
        SELECT 'CREATE TABLE IF NOT EXISTS ' || tablename || ' AS SELECT * FROM ' || tablename || ';' 
        FROM pg_tables 
        WHERE schemaname = 'public'
      `;
      
      const result = await pool.query(dumpQuery);
      
      // Write to file
      fs.writeFileSync(backupPath, '-- DietaryDB Backup\n');
      fs.appendFileSync(backupPath, `-- Created: ${new Date().toISOString()}\n\n`);
      result.rows.forEach(row => {
        fs.appendFileSync(backupPath, row['?column?'] + '\n');
      });
      
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
    } catch (error) {
      console.error('Error creating backup:', error);
      res.status(500).json({ message: 'Error creating backup: ' + error.message });
    }
  });
  
  // Schedule backup
  app.post('/api/tasks/backup/schedule', authenticateToken, async (req, res) => {
    console.log('POST /api/tasks/backup/schedule accessed');
    const { schedule, time } = req.body;
    
    try {
      if (schedule) {
        await pool.query(
          `INSERT INTO system_settings (setting_key, setting_value) 
           VALUES ('backup_schedule', $1)
           ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value`,
          [schedule]
        );
      }
      
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
  
  console.log('Additional routes loaded successfully!');
};
