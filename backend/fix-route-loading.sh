#!/bin/bash
# Fix route loading issue

set -e

echo "======================================"
echo "Fixing Route Loading Issue"
echo "======================================"

cd /opt/dietarydb

# Step 1: Check current server.js route loading
echo "Step 1: Checking how routes are loaded in server.js..."
docker exec dietary_backend grep -A5 -B5 "dashboard" /app/server.js || echo "Dashboard route not found in server.js"

# Step 2: Check if the dashboard route file is valid
echo ""
echo "Step 2: Checking dashboard.js syntax..."
docker exec dietary_backend node -c /app/routes/dashboard.js && echo "✓ Dashboard.js syntax is valid" || echo "✗ Dashboard.js has syntax errors"

# Step 3: Fix server.js to ensure dashboard route is loaded
echo ""
echo "Step 3: Ensuring dashboard route is loaded in server.js..."

docker exec dietary_backend sh -c '
# Add dashboard route loading to server.js if missing
if ! grep -q "dashboard" /app/server.js; then
    echo "Adding dashboard route to server.js..."
    
    # Find where other routes are loaded and add dashboard
    sed -i "/routes\/auth/a\\
try {\\
  const dashboardRoutes = require(\"./routes/dashboard\");\\
  app.use(\"/api/dashboard\", authenticateToken, trackActivity, dashboardRoutes);\\
  console.log(\"Dashboard routes loaded\");\\
} catch (err) {\\
  console.error(\"Failed to load dashboard routes:\", err.message);\\
}" /app/server.js
fi
'

# Step 4: Restart backend to load changes
echo ""
echo "Step 4: Restarting backend..."
docker restart dietary_backend

# Wait for backend
echo "Waiting for backend to start..."
sleep 10

# Step 5: Test all API endpoints
echo ""
echo "Step 5: Testing API endpoints..."

# Get token
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | \
  grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ ! -z "$TOKEN" ]; then
    echo "✓ Login successful"
    
    echo ""
    echo "Testing endpoints:"
    
    echo -n "Dashboard: "
    curl -s http://localhost:3000/api/dashboard \
      -H "Authorization: Bearer $TOKEN" | head -c 100
    echo ""
    
    echo -n "Users: "
    curl -s http://localhost:3000/api/users \
      -H "Authorization: Bearer $TOKEN" | head -c 100
    echo ""
    
    echo -n "Items: "
    curl -s http://localhost:3000/api/items \
      -H "Authorization: Bearer $TOKEN" | head -c 100
    echo ""
else
    echo "✗ Login failed"
fi

# Step 6: Check backend logs for errors
echo ""
echo "Step 6: Checking backend logs..."
docker logs dietary_backend --tail 20 | grep -E "(Error|error|loaded)" || true

echo ""
echo "======================================"
echo "Route Loading Fix Complete"
echo "======================================"
echo ""
echo "Now please:"
echo "1. Clear browser cache (Ctrl+Shift+Delete)"
echo "2. Open new incognito window"
echo "3. Go to http://localhost:3001"
echo "4. Login with admin/admin123"
echo ""
echo "The dashboard should now load properly."
