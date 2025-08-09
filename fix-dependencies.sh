#!/bin/bash
# /opt/dietarydb/fix-dependencies.sh
# Fix missing npm dependencies in backend

set -e

echo "======================================"
echo "Fixing Missing Backend Dependencies"
echo "======================================"

cd /opt/dietarydb

# Step 1: Check current package.json
echo ""
echo "Step 1: Checking backend package.json..."
echo "========================================"
if [ -f "backend/package.json" ]; then
    echo "Current package.json exists"
else
    echo "Creating package.json..."
    cat > backend/package.json << 'EOF'
{
  "name": "dietarydb-backend",
  "version": "1.0.0",
  "description": "DietaryDB Backend API",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.0.0",
    "morgan": "^1.10.0",
    "compression": "^1.7.4",
    "dotenv": "^16.0.3",
    "pg": "^8.10.0",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.0",
    "express-validator": "^6.15.0"
  }
}
EOF
fi

# Step 2: Install dependencies in the running container
echo ""
echo "Step 2: Installing dependencies in running container..."
echo "======================================================"

# Install bcryptjs and other critical dependencies
docker exec dietary_backend sh -c "cd /app && npm install bcryptjs jsonwebtoken pg express cors --save"

# Verify bcryptjs is installed
echo ""
echo "Verifying bcryptjs installation..."
docker exec dietary_backend sh -c "ls -la node_modules/ | grep bcrypt" || echo "bcryptjs not found in node_modules"

# Step 3: Test bcrypt again
echo ""
echo "Step 3: Testing bcrypt functionality..."
echo "======================================="
docker exec dietary_backend node -e "
const bcrypt = require('bcryptjs');
console.log('bcryptjs loaded successfully');
const hash = '\$2b\$10\$YqVb5I2WMhPMkqUQqLMlH.oZxQ2W9Y0vBhzBqK2.vKQRxMqD0B4mS';
bcrypt.compare('admin123', hash, (err, result) => {
    console.log('Password comparison result:', result);
});
"

# Step 4: Restart backend to ensure all modules are loaded
echo ""
echo "Step 4: Restarting backend..."
echo "============================="
docker restart dietary_backend

echo "Waiting for backend to restart..."
sleep 10

# Step 5: Test login
echo ""
echo "Step 5: Testing login with fixed dependencies..."
echo "==============================================="

RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')

if echo "$RESPONSE" | grep -q "token"; then
    echo "✓ Login successful!"
    echo "$RESPONSE" | python3 -m json.tool | head -15
else
    echo "✗ Login still failing: $RESPONSE"
    echo ""
    echo "Checking logs:"
    docker logs dietary_backend --tail 20
fi

echo ""
echo "======================================"
echo "Dependency Fix Complete!"
echo "======================================"
echo ""
echo "Now try logging in at http://localhost:3001"
echo "  Username: admin"
echo "  Password: admin123"
echo ""
