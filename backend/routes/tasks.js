const express = require('express');
const db = require('../config/database');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const cron = require('node-cron');

const router = express.Router();
const BACKUP_DIR = '/db_backup';

// Store scheduled tasks
let scheduledTasks = {};

// Initialize scheduled maintenance
async function initializeScheduledMaintenance() {
  try {
    const schedules = await db.query(
      'SELECT * FROM maintenance_schedule WHERE is_active = true'
    );
    
    schedules.rows.forEach(schedule => {
      if (cron.validate(schedule.cron_expression)) {
        scheduledTasks[schedule.schedule_id] = cron.schedule(
          schedule.cron_expression,
          async () => {
            await runScheduledMaintenance(schedule.schedule_name);
          }
        );
      }
    });
  } catch (error) {
    console.error('Error initializing scheduled maintenance:', error);
  }
}

// Run scheduled maintenance
async function runScheduledMaintenance(scheduleName) {
  const startTime = new Date();
  try {
    // Log start
    await db.query(
      'INSERT INTO maintenance_log (task_type, status, started_at, created_by) VALUES ($1, $2, $3, $4)',
      [scheduleName, 'Running', startTime, 'System']
    );
    
    // Run maintenance tasks
    await db.query('VACUUM ANALYZE');
    await db.query('REINDEX DATABASE dietary_db');
    
    // Log completion
    await db.query(
      'INSERT INTO maintenance_log (task_type, status, started_at, completed_at, created_by, details) VALUES ($1, $2, $3, $4, $5, $6)',
      [scheduleName, 'Completed', startTime, new Date(), 'System', 'VACUUM ANALYZE and REINDEX completed successfully']
    );
    
    // Update last run time
    await db.query(
      'UPDATE maintenance_schedule SET last_run = $1 WHERE schedule_name = $2',
      [new Date(), scheduleName]
    );
  } catch (error) {
    console.error('Scheduled maintenance error:', error);
    await db.query(
      'INSERT INTO maintenance_log (task_type, status, started_at, completed_at, created_by, details) VALUES ($1, $2, $3, $4, $5, $6)',
      [scheduleName, 'Failed', startTime, new Date(), 'System', error.message]
    );
  }
}

// Get database statistics
router.get('/database/stats', [authenticateToken, authorizeRole('Admin')], async (req, res) => {
  try {
    const userCount = await db.query('SELECT COUNT(*) as count FROM users');
    const activeUserCount = await db.query('SELECT COUNT(*) as count FROM users WHERE is_active = true');
    const itemCount = await db.query('SELECT COUNT(*) as count FROM items');
    const activeItemCount = await db.query('SELECT COUNT(*) as count FROM items WHERE is_active = true');
    const categoryCount = await db.query('SELECT COUNT(*) as count FROM categories');
    const dbSize = await db.query('SELECT pg_database_size(current_database()) as size');
    
    res.json({
      total_users: parseInt(userCount.rows[0].count),
      active_users: parseInt(activeUserCount.rows[0].count),
      total_items: parseInt(itemCount.rows[0].count),
      active_items: parseInt(activeItemCount.rows[0].count),
      categories: parseInt(categoryCount.rows[0].count),
      database_size: dbSize.rows[0].size,
      database_size_formatted: formatBytes(dbSize.rows[0].size)
    });
  } catch (error) {
    console.error('Error fetching database stats:', error);
    res.status(500).json({ message: 'Error fetching database statistics' });
  }
});

// Get maintenance schedule and last run
router.get('/maintenance/schedule', [authenticateToken, authorizeRole('Admin')], async (req, res) => {
  try {
    const schedule = await db.query(
      'SELECT * FROM maintenance_schedule WHERE is_active = true ORDER BY schedule_id LIMIT 1'
    );
    
    const lastRun = await db.query(
      'SELECT * FROM maintenance_log WHERE status = $1 ORDER BY completed_at DESC LIMIT 1',
      ['Completed']
    );
    
    res.json({
      schedule: schedule.rows[0] || null,
      lastRun: lastRun.rows[0] || null
    });
  } catch (error) {
    console.error('Error fetching maintenance schedule:', error);
    res.status(500).json({ message: 'Error fetching maintenance schedule' });
  }
});

// Update maintenance schedule
router.put('/maintenance/schedule', [authenticateToken, authorizeRole('Admin')], async (req, res) => {
  try {
    const { cron_expression, is_active } = req.body;
    
    if (!cron.validate(cron_expression)) {
      return res.status(400).json({ message: 'Invalid cron expression' });
    }
    
    const result = await db.query(
      'UPDATE maintenance_schedule SET cron_expression = $1, is_active = $2 WHERE schedule_id = 1 RETURNING *',
      [cron_expression, is_active]
    );
    
    // Restart scheduled tasks
    Object.values(scheduledTasks).forEach(task => task.stop());
    scheduledTasks = {};
    await initializeScheduledMaintenance();
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating maintenance schedule:', error);
    res.status(500).json({ message: 'Error updating maintenance schedule' });
  }
});

// Run maintenance manually
router.post('/maintenance/run', [authenticateToken, authorizeRole('Admin')], async (req, res) => {
  const startTime = new Date();
  try {
    // Log start
    const logResult = await db.query(
      'INSERT INTO maintenance_log (task_type, status, started_at, created_by) VALUES ($1, $2, $3, $4) RETURNING log_id',
      ['Manual Maintenance', 'Running', startTime, req.user.username]
    );
    
    // Run maintenance
    await db.query('VACUUM ANALYZE');
    await db.query('REINDEX DATABASE dietary_db');
    
    // Update log
    await db.query(
      'UPDATE maintenance_log SET status = $1, completed_at = $2, details = $3 WHERE log_id = $4',
      ['Completed', new Date(), 'VACUUM ANALYZE and REINDEX completed successfully', logResult.rows[0].log_id]
    );
    
    res.json({ 
      message: 'Maintenance tasks completed successfully',
      tasks_completed: ['VACUUM ANALYZE', 'REINDEX DATABASE']
    });
  } catch (error) {
    console.error('Error running maintenance:', error);
    res.status(500).json({ message: 'Error running maintenance tasks' });
  }
});

// Create backup
router.post('/backup/create', [authenticateToken, authorizeRole('Admin')], async (req, res) => {
  await ensureBackupDir();
  
  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
  const filename = `dietary_backup_${timestamp}.sql`;
  const filepath = path.join(BACKUP_DIR, filename);
  
  const command = `PGPASSWORD="${process.env.DB_PASSWORD}" pg_dump -h dietary_postgres -U ${process.env.DB_USER} -d ${process.env.DB_NAME} -f ${filepath}`;
  
  exec(command, async (error, stdout, stderr) => {
    if (error) {
      try {
        await fs.unlink(filepath);
      } catch (e) {}
      
      return res.status(500).json({ 
        message: 'Backup failed',
        error: error.message,
        details: stderr
      });
    }
    
    try {
      const stats = await fs.stat(filepath);
      res.json({
        message: 'Backup created successfully',
        filename: filename,
        size: stats.size,
        size_formatted: formatBytes(stats.size)
      });
    } catch (statError) {
      res.json({
        message: 'Backup created but could not get file info',
        filename: filename
      });
    }
  });
});

// List backups
router.get('/backup/list', [authenticateToken, authorizeRole('Admin')], async (req, res) => {
  await ensureBackupDir();
  
  try {
    const files = await fs.readdir(BACKUP_DIR);
    const backups = [];
    
    for (const file of files) {
      if (file.endsWith('.sql')) {
        try {
          const stats = await fs.stat(path.join(BACKUP_DIR, file));
          if (stats.size > 0) {
            backups.push({
              filename: file,
              size: stats.size,
              size_formatted: formatBytes(stats.size),
              created: stats.mtime
            });
          }
        } catch (statError) {
          console.error(`Error getting stats for ${file}:`, statError);
        }
      }
    }
    
    backups.sort((a, b) => new Date(b.created) - new Date(a.created));
    res.json(backups);
  } catch (error) {
    console.error('Error listing backups:', error);
    res.status(500).json({ message: 'Error listing backups' });
  }
});

// Delete backup
router.delete('/backup/:filename', [authenticateToken, authorizeRole('Admin')], async (req, res) => {
  try {
    const filename = req.params.filename;
    
    if (!filename.match(/^dietary_backup_[\d\-T]+\.sql$/)) {
      return res.status(400).json({ message: 'Invalid filename' });
    }
    
    const filepath = path.join(BACKUP_DIR, filename);
    await fs.unlink(filepath);
    
    res.json({ message: 'Backup deleted successfully' });
  } catch (error) {
    console.error('Error deleting backup:', error);
    res.status(500).json({ message: 'Error deleting backup' });
  }
});

// Download backup
router.get('/backup/download/:filename', [authenticateToken, authorizeRole('Admin')], async (req, res) => {
  try {
    const filename = req.params.filename;
    
    if (!filename.match(/^dietary_backup_[\d\-T]+\.sql$/)) {
      return res.status(400).json({ message: 'Invalid filename' });
    }
    
    const filepath = path.join(BACKUP_DIR, filename);
    await fs.access(filepath);
    
    res.download(filepath, filename);
  } catch (error) {
    console.error('Error downloading backup:', error);
    res.status(404).json({ message: 'Backup file not found' });
  }
});

// Helper functions
async function ensureBackupDir() {
  try {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
  } catch (error) {
    console.error('Error creating backup directory:', error);
  }
}

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Initialize scheduled maintenance on module load
initializeScheduledMaintenance();

module.exports = router;
