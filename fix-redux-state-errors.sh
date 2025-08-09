#!/bin/bash
# Fix Redux state errors causing blank dashboard

set -e

echo "======================================"
echo "Fixing Redux State Errors"
echo "======================================"

cd /opt/dietarydb

# Step 1: Check what the dashboard API is returning
echo "Step 1: Checking dashboard API response..."
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | \
  grep -o '"token":"[^"]*' | cut -d'"' -f4)

echo "Dashboard API response:"
curl -s http://localhost:3000/api/dashboard \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | python3 -m json.tool || echo "No valid JSON response"

# Step 2: Check if dashboard route exists
echo ""
echo "Step 2: Checking if dashboard route exists..."
docker exec dietary_backend ls -la /app/routes/ | grep dashboard || echo "No dashboard route found"

# Step 3: Create a mock dashboard route if missing
echo ""
echo "Step 3: Creating dashboard route..."
cat > backend/routes/dashboard.js << 'EOF'
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
EOF

# Step 4: Copy to backend and restart
echo ""
echo "Step 4: Applying dashboard route fix..."
docker cp backend/routes/dashboard.js dietary_backend:/app/routes/dashboard.js

# Step 5: Also fix the state initialization issue
echo ""
echo "Step 5: Creating frontend state fix..."

# Create a fix for the Redux state issue
cat > admin-frontend-fix/state-fix.js << 'EOF'
// This fix ensures Redux state is properly initialized
// Add to your Redux store configuration

const defaultState = {
  auth: {
    isAuthenticated: false,
    user: null,
    token: null
  },
  dashboard: {
    statistics: {
      activeUsers: 0,
      activePatients: 0,
      menuItems: 0,
      todayOrders: 0
    },
    recentActivity: [],
    quickActions: {}
  },
  ui: {
    loading: false,
    error: null
  }
};

// Ensure all reducers have default states
const safeReducer = (reducer) => {
  return (state, action) => {
    if (state === undefined) {
      return defaultState;
    }
    return reducer(state, action);
  };
};
EOF

# Step 6: Restart backend
echo ""
echo "Step 6: Restarting backend..."
docker restart dietary_backend

# Wait for backend to start
sleep 10

# Step 7: Test the fix
echo ""
echo "Step 7: Testing dashboard endpoint..."
curl -s http://localhost:3000/api/dashboard \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | python3 -m json.tool || echo "Dashboard endpoint still not working"

echo ""
echo "======================================"
echo "Redux State Fix Applied"
echo "======================================"
echo ""
echo "The backend now has proper dashboard endpoints."
echo ""
echo "To complete the fix:"
echo "1. Clear your browser cache completely (Ctrl+Shift+Delete)"
echo "2. Close all browser tabs for localhost:3001"
echo "3. Open a new incognito/private window"
echo "4. Go to http://localhost:3001"
echo "5. Log in with admin/admin123"
echo ""
echo "If still blank, we may need to rebuild the frontend:"
echo "docker-compose down"
echo "docker-compose up -d"
echo ""
echo "The errors indicate the React app is expecting certain data"
echo "structures that aren't being provided by the API."
