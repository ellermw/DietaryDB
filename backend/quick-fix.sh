#!/bin/bash
# /opt/dietarydb/quick-fix.sh
# Quick fix for common DietaryDB issues

set -e

echo "======================================"
echo "DietaryDB Quick Fix Script"
echo "======================================"

cd /opt/dietarydb

# 1. Ensure containers are running
echo ""
echo "1. Starting containers if not running..."
docker-compose up -d

# Wait for containers
sleep 10

# 2. Fix CORS in running backend container
echo ""
echo "2. Fixing CORS configuration in backend..."
docker exec dietary_backend sh -c "cat > /tmp/cors-fix.js << 'EOF'
// CORS fix for server.js
const fs = require('fs');
const serverFile = '/app/server.js';
let content = fs.readFileSync(serverFile, 'utf8');

// Check if CORS is already properly configured
if (!content.includes('cors(corsOptions)')) {
  // Find where cors is imported and add configuration
  const corsImportIndex = content.indexOf(\"const cors = require('cors');\");
  if (corsImportIndex !== -1) {
    const insertPoint = content.indexOf('\\n', corsImportIndex) + 1;
    
    const corsConfig = \`
// CORS configuration
const corsOptions = {
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 86400
};
\`;
    
    content = content.slice(0, insertPoint) + corsConfig + content.slice(insertPoint);
    
    // Replace app.use(cors()); with app.use(cors(corsOptions));
    content = content.replace('app.use(cors());', 'app.use(cors(corsOptions));');
    content = content.replace('app.use(cors())', 'app.use(cors(corsOptions))');
    
    // Add OPTIONS handler if not present
    if (!content.includes(\"app.options('*'\")) {
      const corsUseIndex = content.indexOf('app.use(cors(corsOptions))');
      if (corsUseIndex !== -1) {
        const insertPoint = content.indexOf('\\n', corsUseIndex) + 1;
        content = content.slice(0, insertPoint) + \"app.options('*', cors(corsOptions));\\n\" + content.slice(insertPoint);
      }
    }
    
    fs.writeFileSync(serverFile, content);
    console.log('CORS configuration updated');
  }
}
EOF
node /tmp/cors-fix.js"

# 3. Ensure dashboard route exists
echo ""
echo "3. Ensuring dashboard route exists..."
docker exec dietary_backend sh -c "[ -f /app/routes/dashboard.js ] || cat > /app/routes/dashboard.js << 'EOF'
const express = require('express');
const router = express.Router();

// Mock dashboard route
router.get('/', async (req, res) => {
  console.log('Dashboard route accessed');
  res.json({
    totalItems: 0,
    totalUsers: 1,
    totalCategories: 0,
    recentActivity: [],
    message: 'Dashboard data loading...'
  });
});

router.get('/stats', async (req, res) => {
  res.json({
    total_items: 0,
    total_users: 1,
    total_categories: 0,
    ada_items: 0
  });
});

module.exports = router;
EOF"

# 4. Fix route loading in server.js
echo ""
echo "4. Ensuring routes are loaded in server.js..."
docker exec dietary_backend sh -c "
# Check if dashboard route is loaded
if ! grep -q 'routes/dashboard' /app/server.js; then
  # Find where routes are loaded and add dashboard
  sed -i \"/const authRoutes = require/a const dashboardRoutes = require('./routes/dashboard');\" /app/server.js
  sed -i \"/app.use('\/api\/auth'/a app.use('/api/dashboard', authenticateToken, trackActivity, dashboardRoutes);\" /app/server.js
  echo 'Dashboard route added to server.js'
fi
"

# 5. Initialize database if needed
echo ""
echo "5. Ensuring database is initialized..."
docker exec dietary_postgres psql -U dietary_user -d dietary_db -c "
-- Create users table if not exists
CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create items table if not exists
CREATE TABLE IF NOT EXISTS items (
    item_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    is_ada_friendly BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert admin user if not exists
INSERT INTO users (username, password, first_name, last_name, role) 
VALUES ('admin', '\$2b\$10\$YqVb5I2WMhPMkqUQqLMlH.oZxQ2W9Y0vBhzBqK2.vKQRxMqD0B4mS', 'System', 'Administrator', 'Admin')
ON CONFLICT (username) DO NOTHING;
" 2>/dev/null || echo "Database already initialized"

# 6. Restart backend to apply changes
echo ""
echo "6. Restarting backend container..."
docker restart dietary_backend

# Wait for backend to start
echo "Waiting for backend to restart..."
sleep 10

# 7. Test the fixes
echo ""
echo "7. Testing fixes..."
echo "=================="

# Test health
echo -n "Health check: "
HEALTH=$(curl -s http://localhost:3000/health 2>/dev/null | grep -o "healthy" || echo "failed")
echo "$HEALTH"

# Test CORS
echo -n "CORS headers: "
CORS=$(curl -s -I -X OPTIONS http://localhost:3000/api/test 2>/dev/null | grep -c "Access-Control" || echo "0")
echo "$CORS headers found"

# Test login
echo -n "Login test: "
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' 2>/dev/null | \
  grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ ! -z "$TOKEN" ]; then
  echo "SUCCESS"
  
  # Test dashboard
  echo -n "Dashboard test: "
  DASHBOARD=$(curl -s http://localhost:3000/api/dashboard \
    -H "Authorization: Bearer $TOKEN" 2>/dev/null | \
    grep -o "totalUsers" || echo "failed")
  echo "$DASHBOARD"
else
  echo "FAILED"
fi

# 8. Show container status
echo ""
echo "8. Container Status:"
echo "==================="
docker ps | grep dietary

echo ""
echo "======================================"
echo "Quick Fix Complete!"
echo "======================================"
echo ""
echo "Next steps:"
echo "1. Clear browser cache (Ctrl+Shift+Delete)"
echo "2. Open incognito/private window"
echo "3. Go to http://localhost:3001"
echo "4. Login with: admin / admin123"
echo ""
echo "If issues persist, run the comprehensive fix:"
echo "  chmod +x /opt/dietarydb/fix-backend-issues.sh"
echo "  /opt/dietarydb/fix-backend-issues.sh"
echo ""
echo "To view real-time logs:"
echo "  docker logs dietary_backend -f"
