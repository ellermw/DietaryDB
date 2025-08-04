const express = require('express');
const db = require('../config/database');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

// Simple test route
router.get('/test', authenticateToken, (req, res) => {
  res.json({ message: 'Tasks routes are working!' });
});

// Get database statistics
router.get('/database/stats', [
  authenticateToken,
  authorizeRole('Admin')
], async (req, res) => {
  try {
    const stats = await db.query(`
      SELECT 
        pg_database_size(current_database()) as database_size,
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM patient_info) as total_patients,
        (SELECT COUNT(*) FROM meal_orders) as total_orders,
        (SELECT COUNT(*) FROM backup_history WHERE status = 'completed') as total_backups,
        (SELECT MAX(created_date) FROM backup_history WHERE status = 'completed') as last_backup
    `);
    
    res.json(stats.rows[0]);
  } catch (error) {
    console.error('Error fetching database stats:', error);
    // Return empty stats instead of error
    res.json({
      database_size: "0",
      total_users: "0",
      total_patients: "0",
      total_orders: "0",
      total_backups: "0",
      last_backup: null
    });
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

// Placeholder routes
router.post('/backup/manual', authenticateToken, authorizeRole('Admin'), (req, res) => {
  res.json({ message: 'Manual backup functionality coming soon' });
});

router.get('/backup/history', authenticateToken, authorizeRole('Admin'), (req, res) => {
  res.json([]);
});

router.get('/backup/schedules', authenticateToken, authorizeRole('Admin'), (req, res) => {
  res.json([]);
});

router.post('/backup/schedule', authenticateToken, authorizeRole('Admin'), (req, res) => {
  res.json({ message: 'Schedule creation coming soon' });
});

module.exports = router;
