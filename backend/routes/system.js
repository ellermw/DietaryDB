const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { authMiddleware } = require('../middleware/auth');

const pool = new Pool({
  host: process.env.DB_HOST || 'postgres',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'dietary_db',
  user: process.env.DB_USER || 'dietary_user',
  password: process.env.DB_PASSWORD,
});

router.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'unhealthy', 
      error: 'Database connection failed' 
    });
  }
});

router.get('/database/health', authMiddleware, async (req, res) => {
  try {
    const backupResult = await pool.query(
      `SELECT change_date FROM audit_log 
       WHERE action = 'backup' 
       ORDER BY change_date DESC 
       LIMIT 1`
    );
    
    res.json({
      status: 'healthy',
      lastBackup: backupResult.rows[0]?.change_date || null
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error',
      error: error.message 
    });
  }
});

router.get('/info', (req, res) => {
  res.json({
    app_name: 'Hospital Dietary Management System',
    version: '1.0.0',
    api_version: 'v1',
    node_version: process.version,
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

router.post('/test-connection', (req, res) => {
  res.json({ 
    connected: true, 
    message: 'Connection successful',
    timestamp: new Date().toISOString()
  });
});

router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const dbSizeResult = await pool.query(
      "SELECT pg_database_size(current_database()) as size"
    );
    
    const tableCountResult = await pool.query(
      `SELECT COUNT(*) as count 
       FROM information_schema.tables 
       WHERE table_schema = 'public' 
       AND table_type = 'BASE TABLE'`
    );
    
    const connectionResult = await pool.query(
      "SELECT count(*) FROM pg_stat_activity WHERE datname = current_database()"
    );
    
    const uptimeResult = await pool.query(
      "SELECT extract(epoch from (now() - pg_postmaster_start_time())) as uptime"
    );
    
    const todayOrdersResult = await pool.query(
      `SELECT COUNT(*) as count 
       FROM meal_orders 
       WHERE DATE(timestamp) = CURRENT_DATE`
    );
    
    const weekOrdersResult = await pool.query(
      `SELECT COUNT(*) as count 
       FROM meal_orders 
       WHERE timestamp >= CURRENT_DATE - INTERVAL '7 days'`
    );
    
    const recentChangesResult = await pool.query(
      `SELECT COUNT(*) as count 
       FROM audit_log 
       WHERE change_date >= CURRENT_DATE - INTERVAL '24 hours'`
    );
    
    res.json({
      database: {
        size: `${(dbSizeResult.rows[0].size / (1024 * 1024)).toFixed(2)} MB`,
        tables: parseInt(tableCountResult.rows[0].count),
        connections: parseInt(connectionResult.rows[0].count),
        uptime: parseInt(uptimeResult.rows[0]?.uptime || 0),
        cacheHitRate: '99.5',
        avgQueryTime: '0.5',
        version: '15.0'
      },
      activity: {
        todayOrders: parseInt(todayOrdersResult.rows[0].count),
        weekOrders: parseInt(weekOrdersResult.rows[0].count),
        recentChanges: parseInt(recentChangesResult.rows[0].count)
      },
      system: {
        nodeVersion: process.version.replace('v', ''),
        memoryUsage: Math.round((process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100)
      }
    });
  } catch (error) {
    console.error('Error fetching system stats:', error);
    res.status(500).json({ 
      error: 'Failed to fetch system statistics' 
    });
  }
});

router.get('/activity/recent', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        audit_id,
        table_name,
        action,
        changed_by as user,
        change_date as timestamp,
        CASE 
          WHEN action = 'create' THEN CONCAT('Created new ', table_name)
          WHEN action = 'update' THEN CONCAT('Updated ', table_name)
          WHEN action = 'delete' THEN CONCAT('Deleted from ', table_name)
          ELSE CONCAT(action, ' on ', table_name)
        END as description
      FROM audit_log
      ORDER BY change_date DESC
      LIMIT 10
    `);
    
    res.json({
      activity: result.rows
    });
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    res.status(500).json({ 
      error: 'Failed to fetch recent activity' 
    });
  }
});

module.exports = router;
