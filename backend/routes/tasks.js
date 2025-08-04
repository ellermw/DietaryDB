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
