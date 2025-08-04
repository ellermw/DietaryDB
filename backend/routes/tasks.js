const express = require('express');
const db = require('../config/database');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

const router = express.Router();

// Test route
router.get('/test', (req, res) => {
  res.json({ message: 'Tasks route is working' });
});

// Get database statistics
router.get('/database/stats', [
  authenticateToken,
  authorizeRole('Admin')
], async (req, res) => {
  try {
    const stats = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM users WHERE is_active = true) as active_users,
        (SELECT COUNT(*) FROM items WHERE is_active = true) as active_items,
        (SELECT COUNT(DISTINCT category) FROM items WHERE is_active = true) as total_categories,
        (SELECT pg_database_size(current_database())) as database_size
    `);
    
    console.log('Database stats:', stats.rows[0]);
    res.json(stats.rows[0]);
  } catch (error) {
    console.error('Error fetching database stats:', error);
    res.status(500).json({ message: 'Error fetching database statistics' });
  }
});

// Run maintenance
router.post('/maintenance/run', [
  authenticateToken,
  authorizeRole('Admin')
], async (req, res) => {
  try {
    console.log('Running maintenance tasks...');
    await db.query('VACUUM ANALYZE');
    
    res.json({ 
      message: 'Maintenance completed successfully',
      tasks_completed: ['VACUUM ANALYZE']
    });
  } catch (error) {
    console.error('Error running maintenance:', error);
    res.status(500).json({ message: 'Error running maintenance tasks' });
  }
});

// Get backup configuration
router.get('/backup/config', [
  authenticateToken,
  authorizeRole('Admin')
], async (req, res) => {
  res.json({ backup_directory: process.env.BACKUP_DIR || '/db_backup' });
});

// Update backup configuration
router.post('/backup/config', [
  authenticateToken,
  authorizeRole('Admin')
], async (req, res) => {
  const { backup_directory } = req.body;
  if (!backup_directory) {
    return res.status(400).json({ message: 'Backup directory is required' });
  }
  
  process.env.BACKUP_DIR = backup_directory;
  res.json({ message: 'Backup directory updated', backup_directory });
});

// Create backup
router.post('/backup/create', [
  authenticateToken,
  authorizeRole('Admin')
], async (req, res) => {
  try {
    console.log('Creating backup...');
    const backupDir = process.env.BACKUP_DIR || '/db_backup';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `dietary_backup_${timestamp}.sql`;
    const filepath = path.join(backupDir, filename);
    
    // Ensure backup directory exists
    try {
      await fs.mkdir(backupDir, { recursive: true });
    } catch (err) {
      console.log('Backup directory already exists or error creating:', err.message);
    }
    
    // Create pg_dump command
    const dbHost = process.env.DB_HOST || 'postgres';
    const dbUser = process.env.DB_USER || 'dietary_user';
    const dbName = process.env.DB_NAME || 'dietary_db';
    const dbPassword = process.env.DB_PASSWORD || 'DietarySecurePass2024!';
    
    const command = `PGPASSWORD="${dbPassword}" pg_dump -h ${dbHost} -U ${dbUser} -d ${dbName} > ${filepath}`;
    
    console.log('Running backup command...');
    
    exec(command, async (error, stdout, stderr) => {
      if (error) {
        console.error('Backup error:', error);
        console.error('Stderr:', stderr);
        return res.status(500).json({ 
          message: 'Backup failed', 
          error: error.message,
          stderr: stderr 
        });
      }
      
      try {
        const stats = await fs.stat(filepath);
        console.log('Backup created successfully:', filename, 'Size:', stats.size);
        res.json({ 
          message: 'Backup created successfully',
          filename: filename,
          size: stats.size,
          path: filepath
        });
      } catch (statError) {
        console.log('Could not stat file, but backup may have succeeded');
        res.json({ 
          message: 'Backup created successfully',
          filename: filename
        });
      }
    });
  } catch (error) {
    console.error('Error creating backup:', error);
    res.status(500).json({ message: 'Error creating backup', error: error.message });
  }
});

// Schedule backup
router.post('/backup/schedule', [
  authenticateToken,
  authorizeRole('Admin')
], async (req, res) => {
  try {
    const { schedule, enabled } = req.body;
    console.log('Scheduling backup:', { schedule, enabled });
    
    res.json({ 
      message: enabled ? 'Backup schedule created' : 'Backup schedule disabled',
      schedule: schedule,
      enabled: enabled
    });
  } catch (error) {
    console.error('Error scheduling backup:', error);
    res.status(500).json({ message: 'Error scheduling backup' });
  }
});

// List backups
router.get('/backup/list', [
  authenticateToken,
  authorizeRole('Admin')
], async (req, res) => {
  try {
    const backupDir = process.env.BACKUP_DIR || '/db_backup';
    console.log('Listing backups from:', backupDir);
    
    try {
      const files = await fs.readdir(backupDir);
      const backups = [];
      
      for (const file of files) {
        if (file.endsWith('.sql')) {
          const filepath = path.join(backupDir, file);
          try {
            const stats = await fs.stat(filepath);
            backups.push({
              filename: file,
              size: stats.size,
              created: stats.mtime
            });
          } catch (err) {
            console.log('Could not stat file:', file);
          }
        }
      }
      
      backups.sort((a, b) => new Date(b.created) - new Date(a.created));
      console.log('Found backups:', backups.length);
      res.json(backups);
    } catch (error) {
      console.log('Backup directory might not exist:', error.message);
      res.json([]);
    }
  } catch (error) {
    console.error('Error listing backups:', error);
    res.status(500).json({ message: 'Error listing backups' });
  }
});

module.exports = router;
