const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'dietary_postgres',
  port: 5432,
  database: process.env.DB_NAME || 'dietary_db',
  user: process.env.DB_USER || 'dietary_user',
  password: process.env.DB_PASSWORD || 'DietarySecurePass2024!'
});

// Progress tracking store
const progressStore = {};

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i];
}

// Get database stats
router.get('/database/stats', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM users WHERE is_active = true) as active_users,
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM items WHERE is_active = true) as active_items,
        (SELECT COUNT(DISTINCT category) FROM items) as categories,
        pg_database_size(current_database()) as database_size
    `);
    
    result.rows[0].database_size = formatBytes(parseInt(result.rows[0].database_size));
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get progress for a task
router.get('/progress/:taskId', (req, res) => {
  const progress = progressStore[req.params.taskId] || {
    progress: 0,
    logs: [],
    completed: false
  };
  res.json(progress);
});

// Run maintenance with live progress
router.post('/maintenance/run', async (req, res) => {
  const taskId = 'maint_' + Date.now();
  progressStore[taskId] = { progress: 0, logs: [], completed: false };
  
  res.json({ message: 'Maintenance started', taskId });
  
  // Run maintenance asynchronously
  setTimeout(async () => {
    try {
      progressStore[taskId].logs.push({
        message: 'Starting maintenance tasks...',
        timestamp: new Date().toISOString()
      });
      progressStore[taskId].progress = 10;
      
      progressStore[taskId].logs.push({
        message: 'Analyzing database...',
        timestamp: new Date().toISOString()
      });
      progressStore[taskId].progress = 30;
      
      progressStore[taskId].logs.push({
        message: 'Running VACUUM ANALYZE...',
        timestamp: new Date().toISOString()
      });
      progressStore[taskId].progress = 50;
      
      await pool.query('VACUUM ANALYZE');
      
      progressStore[taskId].logs.push({
        message: 'Database optimized',
        timestamp: new Date().toISOString()
      });
      progressStore[taskId].progress = 70;
      
      progressStore[taskId].logs.push({
        message: 'Cleaning old logs...',
        timestamp: new Date().toISOString()
      });
      progressStore[taskId].progress = 85;
      
      await pool.query("DELETE FROM activity_log WHERE created_date < NOW() - INTERVAL '90 days'");
      
      progressStore[taskId].logs.push({
        message: 'Maintenance completed successfully!',
        timestamp: new Date().toISOString()
      });
      progressStore[taskId].progress = 100;
      progressStore[taskId].completed = true;
      
    } catch (error) {
      progressStore[taskId].logs.push({
        message: 'Error: ' + error.message,
        timestamp: new Date().toISOString()
      });
      progressStore[taskId].progress = -1;
      progressStore[taskId].completed = true;
    }
  }, 100);
});

// Create backup with live progress
router.post('/backup/create', async (req, res) => {
  const taskId = 'backup_' + Date.now();
  progressStore[taskId] = { progress: 0, logs: [], completed: false };
  
  res.json({ message: 'Backup started', taskId });
  
  setTimeout(async () => {
    try {
      progressStore[taskId].logs.push({
        message: 'Initializing backup...',
        timestamp: new Date().toISOString()
      });
      progressStore[taskId].progress = 10;
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('.')[0];
      const filename = 'dietary_backup_' + timestamp + '.sql';
      const filepath = '/opt/dietarydb/backups/databases/' + filename;
      
      progressStore[taskId].logs.push({
        message: 'Creating backup directory...',
        timestamp: new Date().toISOString()
      });
      progressStore[taskId].progress = 20;
      
      await fs.mkdir('/opt/dietarydb/backups/databases', { recursive: true });
      
      progressStore[taskId].logs.push({
        message: 'Dumping database...',
        timestamp: new Date().toISOString()
      });
      progressStore[taskId].progress = 50;
      
      await new Promise((resolve, reject) => {
        const cmd = 'PGPASSWORD="' + process.env.DB_PASSWORD + '" pg_dump -h dietary_postgres -U ' + 
                    process.env.DB_USER + ' -d ' + process.env.DB_NAME + ' -f ' + filepath;
        exec(cmd, (error) => {
          if (error) reject(error);
          else resolve();
        });
      });
      
      progressStore[taskId].logs.push({
        message: 'Verifying backup...',
        timestamp: new Date().toISOString()
      });
      progressStore[taskId].progress = 80;
      
      const stats = await fs.stat(filepath);
      const size = formatBytes(stats.size);
      
      progressStore[taskId].logs.push({
        message: 'Backup created: ' + filename,
        timestamp: new Date().toISOString()
      });
      progressStore[taskId].logs.push({
        message: 'Size: ' + size,
        timestamp: new Date().toISOString()
      });
      progressStore[taskId].progress = 100;
      progressStore[taskId].completed = true;
      
    } catch (error) {
      progressStore[taskId].logs.push({
        message: 'Error: ' + error.message,
        timestamp: new Date().toISOString()
      });
      progressStore[taskId].progress = -1;
      progressStore[taskId].completed = true;
    }
  }, 100);
});

// List all backups
router.get('/backup/list', async (req, res) => {
  try {
    const backupDir = '/opt/dietarydb/backups/databases';
    await fs.mkdir(backupDir, { recursive: true });
    
    const files = await fs.readdir(backupDir);
    const backups = [];
    
    for (const file of files) {
      if (file.endsWith('.sql')) {
        const filepath = path.join(backupDir, file);
        const stats = await fs.stat(filepath);
        backups.push({
          filename: file,
          size: stats.size,
          size_formatted: formatBytes(stats.size),
          created: stats.birthtime || stats.ctime
        });
      }
    }
    
    backups.sort((a, b) => new Date(b.created) - new Date(a.created));
    res.json(backups);
  } catch (error) {
    console.error('List backups error:', error);
    res.json([]);
  }
});

// Delete backup
router.delete('/backup/:filename', async (req, res) => {
  try {
    const filepath = path.join('/opt/dietarydb/backups/databases', req.params.filename);
    await fs.unlink(filepath);
    res.json({ message: 'Backup deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Download backup
router.get('/backup/download/:filename', (req, res) => {
  const filepath = path.join('/opt/dietarydb/backups/databases', req.params.filename);
  res.download(filepath);
});

// Restore backup with progress
router.post('/backup/restore/:filename', async (req, res) => {
  const taskId = 'restore_' + Date.now();
  progressStore[taskId] = { progress: 0, logs: [], completed: false };
  
  res.json({ message: 'Restore started', taskId });
  
  setTimeout(async () => {
    try {
      const backupPath = path.join('/opt/dietarydb/backups/databases', req.params.filename);
      
      progressStore[taskId].logs.push({
        message: 'Starting restore...',
        timestamp: new Date().toISOString()
      });
      progressStore[taskId].progress = 20;
      
      progressStore[taskId].logs.push({
        message: 'Creating safety backup...',
        timestamp: new Date().toISOString()
      });
      progressStore[taskId].progress = 40;
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('.')[0];
      const safetyBackup = '/opt/dietarydb/backups/databases/pre_restore_' + timestamp + '.sql';
      
      await new Promise((resolve, reject) => {
        const cmd = 'PGPASSWORD="' + process.env.DB_PASSWORD + '" pg_dump -h dietary_postgres -U ' + 
                    process.env.DB_USER + ' -d ' + process.env.DB_NAME + ' -f ' + safetyBackup;
        exec(cmd, (error) => {
          if (error) reject(error);
          else resolve();
        });
      });
      
      progressStore[taskId].logs.push({
        message: 'Restoring database...',
        timestamp: new Date().toISOString()
      });
      progressStore[taskId].progress = 70;
      
      await new Promise((resolve, reject) => {
        const cmd = 'PGPASSWORD="' + process.env.DB_PASSWORD + '" psql -h dietary_postgres -U ' + 
                    process.env.DB_USER + ' -d ' + process.env.DB_NAME + ' -f ' + backupPath;
        exec(cmd, (error) => {
          if (error) reject(error);
          else resolve();
        });
      });
      
      progressStore[taskId].logs.push({
        message: 'Database restored successfully!',
        timestamp: new Date().toISOString()
      });
      progressStore[taskId].progress = 100;
      progressStore[taskId].completed = true;
      
    } catch (error) {
      progressStore[taskId].logs.push({
        message: 'Error: ' + error.message,
        timestamp: new Date().toISOString()
      });
      progressStore[taskId].progress = -1;
      progressStore[taskId].completed = true;
    }
  }, 100);
});

// Maintenance schedule
router.get('/maintenance/schedule', async (req, res) => {
  res.json({ 
    cron_expression: '0 2 * * *', 
    is_active: false,
    is_enabled: false
  });
});

router.put('/maintenance/schedule', async (req, res) => {
  res.json({ message: 'Schedule updated' });
});

module.exports = router;
