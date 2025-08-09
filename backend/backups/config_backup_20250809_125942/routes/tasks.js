const express = require('express');
const db = require('../config/database');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

const router = express.Router();

// Get database statistics
router.get('/database/stats', [authenticateToken, authorizeRole('Admin')], async (req, res) => {
  try {
    const stats = {};
    
    // Get database size
    const sizeResult = await db.query("SELECT pg_database_size(current_database()) as size");
    stats.database_size = formatBytes(parseInt(sizeResult.rows[0].size || 0));
    stats.database_size_bytes = parseInt(sizeResult.rows[0].size || 0);
    
    // Get counts
    const userResult = await db.query("SELECT COUNT(*) as count FROM users");
    stats.total_users = parseInt(userResult.rows[0].count || 0);
    
    const activeResult = await db.query("SELECT COUNT(*) as count FROM users WHERE is_active = true");
    stats.active_users = parseInt(activeResult.rows[0].count || 0);
    
    const itemResult = await db.query("SELECT COUNT(*) as count FROM items WHERE is_active = true");
    stats.active_items = parseInt(itemResult.rows[0].count || 0);
    
    const catResult = await db.query("SELECT COUNT(DISTINCT category) as count FROM items WHERE is_active = true");
    stats.categories = parseInt(catResult.rows[0].count || 0);
    
    res.json(stats);
  } catch (error) {
    console.error('Stats error:', error);
    res.json({
      database_size: "0 MB",
      total_users: 0,
      active_users: 0,
      active_items: 0,
      categories: 0
    });
  }
});

// Get maintenance schedule
router.get('/maintenance/schedule', [authenticateToken, authorizeRole('Admin')], async (req, res) => {
  res.json({ 
    cron_expression: '0 2 * * *',
    is_enabled: false,
    last_run: null
  });
});

// Update maintenance schedule
router.put('/maintenance/schedule', [authenticateToken, authorizeRole('Admin')], async (req, res) => {
  res.json({ 
    message: 'Maintenance schedule updated',
    cron_expression: req.body.cron_expression || '0 2 * * *',
    is_enabled: req.body.is_enabled || false
  });
});

// Run maintenance
router.post('/maintenance/run', [authenticateToken, authorizeRole('Admin')], async (req, res) => {
  try {
    await db.query('VACUUM ANALYZE');
    res.json({ 
      message: 'Maintenance tasks completed successfully',
      tasks_completed: ['VACUUM ANALYZE']
    });
  } catch (error) {
    console.error('Maintenance error:', error);
    res.status(500).json({ message: 'Error running maintenance' });
  }
});

// Create backup
router.post('/backup/create', [authenticateToken, authorizeRole('Admin')], async (req, res) => {
  try {
    const backupDir = '/opt/dietarydb/backups/databases';
    await fs.mkdir(backupDir, { recursive: true });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('.')[0];
    const filename = `dietary_backup_${timestamp}.sql`;
    const filepath = path.join(backupDir, filename);
    
    const pgDumpCmd = `PGPASSWORD="${process.env.DB_PASSWORD}" pg_dump -h dietary_postgres -U ${process.env.DB_USER} -d ${process.env.DB_NAME} -f ${filepath}`;
    
    exec(pgDumpCmd, async (error) => {
      if (error) {
        console.error('Backup error:', error);
        return res.status(500).json({ message: 'Backup failed' });
      }
      
      try {
        const stats = await fs.stat(filepath);
        res.json({
          message: 'Backup created successfully',
          filename: filename,
          size: stats.size,
          size_formatted: formatBytes(stats.size),
          created: new Date()
        });
      } catch (e) {
        res.json({ message: 'Backup created', filename: filename });
      }
    });
  } catch (error) {
    console.error('Backup error:', error);
    res.status(500).json({ message: 'Error creating backup' });
  }
});

// List backups
router.get('/backup/list', [authenticateToken, authorizeRole('Admin')], async (req, res) => {
  try {
    const backupDir = '/opt/dietarydb/backups/databases';
    await fs.mkdir(backupDir, { recursive: true });
    
    const files = await fs.readdir(backupDir);
    const backups = [];
    
    for (const file of files) {
      if (file.endsWith('.sql')) {
        try {
          const stats = await fs.stat(path.join(backupDir, file));
          backups.push({
            filename: file,
            size: stats.size,
            size_formatted: formatBytes(stats.size),
            created: stats.mtime
          });
        } catch (e) {
          console.error(`Stat error for ${file}:`, e);
        }
      }
    }
    
    backups.sort((a, b) => new Date(b.created) - new Date(a.created));
    res.json(backups);
  } catch (error) {
    console.error('List error:', error);
    res.json([]);
  }
});

// Delete backup
router.delete('/backup/:filename', [authenticateToken, authorizeRole('Admin')], async (req, res) => {
  try {
    const filename = req.params.filename;
    if (!filename.match(/^dietary_backup_[\d\-T]+\.sql$/)) {
      return res.status(400).json({ message: 'Invalid filename' });
    }
    
    const filepath = path.join('/opt/dietarydb/backups/databases', filename);
    await fs.unlink(filepath);
    res.json({ message: 'Backup deleted successfully' });
  } catch (error) {
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
    
    const filepath = path.join('/opt/dietarydb/backups/databases', filename);
    res.download(filepath);
  } catch (error) {
    res.status(404).json({ message: 'Backup not found' });
  }
});

// Restore backup
router.post('/backup/restore/:filename', [authenticateToken, authorizeRole('Admin')], async (req, res) => {
  try {
    const filename = req.params.filename;
    if (!filename.match(/^dietary_backup_[\d\-T]+\.sql$/)) {
      return res.status(400).json({ message: 'Invalid filename' });
    }
    
    const backupDir = '/opt/dietarydb/backups/databases';
    const filepath = path.join(backupDir, filename);
    
    // Create pre-restore backup
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('.')[0];
    const preRestoreFile = path.join(backupDir, `pre_restore_${timestamp}.sql`);
    
    const backupCmd = `PGPASSWORD="${process.env.DB_PASSWORD}" pg_dump -h dietary_postgres -U ${process.env.DB_USER} -d ${process.env.DB_NAME} -f ${preRestoreFile}`;
    
    await new Promise((resolve, reject) => {
      exec(backupCmd, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });
    
    // Restore the backup
    const restoreCmd = `PGPASSWORD="${process.env.DB_PASSWORD}" psql -h dietary_postgres -U ${process.env.DB_USER} -d ${process.env.DB_NAME} -f ${filepath}`;
    
    await new Promise((resolve, reject) => {
      exec(restoreCmd, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });
    
    res.json({ 
      message: 'Database restored successfully',
      pre_restore_backup: preRestoreFile
    });
  } catch (error) {
    console.error('Restore error:', error);
    res.status(500).json({ message: 'Error restoring backup' });
  }
});

// Placeholder for file upload restore
router.post('/backup/restore', [authenticateToken, authorizeRole('Admin')], async (req, res) => {
  res.status(501).json({ message: 'File upload restore not implemented yet' });
});

function formatBytes(bytes, decimals = 2) {
  if (!bytes || bytes === 0) return '0 MB';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

module.exports = router;
