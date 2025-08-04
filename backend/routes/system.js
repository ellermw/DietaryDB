// /opt/dietarydb/backend/routes/system.js
const express = require('express');
const db = require('../config/database');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { getActivitySummary } = require('../middleware/activityTracker');

const router = express.Router();

// System info - public endpoint
router.get('/info', async (req, res) => {
  try {
    const dbResult = await db.query('SELECT version()');
    const stats = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM users WHERE is_active = true) as active_users,
        (SELECT COUNT(*) FROM patient_info WHERE discharged = false) as active_patients,
        (SELECT COUNT(*) FROM items WHERE is_active = true) as active_items,
        (SELECT COUNT(*) FROM meal_orders WHERE order_date = CURRENT_DATE) as today_orders
    `);
    
    // Get activity summary
    const activitySummary = await getActivitySummary();
    
    res.json({
      name: 'Hospital Dietary Management System',
      version: '1.0.0',
      database: dbResult.rows[0].version,
      statistics: {
        ...stats.rows[0],
        ...activitySummary
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching system info:', error);
    res.status(500).json({ message: 'Error fetching system info' });
  }
});

// Get system health - protected endpoint
router.get('/health', [
  authenticateToken,
  authorizeRole('Admin')
], async (req, res) => {
  try {
    // Check database connection
    await db.query('SELECT 1');
    
    // Get system metrics
    const metrics = await db.query(`
      SELECT 
        pg_database_size(current_database()) as database_size,
        (SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'active') as active_connections,
        (SELECT COUNT(*) FROM users WHERE last_activity > NOW() - INTERVAL '5 minutes') as users_online
    `);
    
    res.json({
      status: 'healthy',
      database: 'connected',
      metrics: metrics.rows[0],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error checking system health:', error);
    res.status(500).json({ 
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get system logs - protected endpoint
router.get('/logs', [
  authenticateToken,
  authorizeRole('Admin')
], async (req, res) => {
  try {
    const { limit = 100, offset = 0 } = req.query;
    
    // This is a placeholder - in production, you'd read from actual log files
    // or a logging service
    res.json({
      message: 'Log retrieval not implemented in this version',
      suggestion: 'Check Docker logs with: docker-compose logs -f'
    });
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ message: 'Error fetching system logs' });
  }
});

module.exports = router;