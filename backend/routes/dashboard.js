const express = require('express');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Main dashboard data
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Get statistics
    const stats = await Promise.all([
      db.query('SELECT COUNT(*) as count FROM users WHERE is_active = true'),
      db.query('SELECT COUNT(*) as count FROM patient_info WHERE discharged = false'),
      db.query('SELECT COUNT(*) as count FROM items WHERE is_active = true'),
      db.query('SELECT COUNT(*) as count FROM meal_orders WHERE order_date = CURRENT_DATE')
    ]);

    const dashboardData = {
      statistics: {
        activeUsers: parseInt(stats[0].rows[0].count) || 0,
        activePatients: parseInt(stats[1].rows[0].count) || 0,
        menuItems: parseInt(stats[2].rows[0].count) || 0,
        todayOrders: parseInt(stats[3].rows[0].count) || 0
      },
      recentActivity: [],
      quickActions: {
        canCreateOrder: true,
        canManagePatients: req.user.role === 'Admin',
        canManageItems: ['Admin', 'User'].includes(req.user.role),
        canViewReports: req.user.role === 'Admin'
      }
    };

    res.json(dashboardData);
  } catch (error) {
    console.error('Dashboard error:', error);
    // Return safe default data
    res.json({
      statistics: {
        activeUsers: 0,
        activePatients: 0,
        menuItems: 0,
        todayOrders: 0
      },
      recentActivity: [],
      quickActions: {
        canCreateOrder: true,
        canManagePatients: false,
        canManageItems: false,
        canViewReports: false
      }
    });
  }
});

// Dashboard statistics endpoint
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM users WHERE is_active = true) as total_users,
        (SELECT COUNT(*) FROM patient_info WHERE discharged = false) as active_patients,
        (SELECT COUNT(*) FROM items WHERE is_active = true) as total_items,
        (SELECT COUNT(*) FROM meal_orders WHERE order_date = CURRENT_DATE) as today_orders
    `);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Stats error:', error);
    res.json({
      total_users: 0,
      active_patients: 0,
      total_items: 0,
      today_orders: 0
    });
  }
});

module.exports = router;
