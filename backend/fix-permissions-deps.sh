#!/bin/bash
# /opt/dietarydb/fix-permissions-deps.sh
# Fix permissions and install dependencies

set -e

echo "======================================"
echo "Fixing Permissions and Dependencies"
echo "======================================"

cd /opt/dietarydb

# Step 1: Check current ownership in container
echo ""
echo "Step 1: Checking current permissions..."
echo "======================================="
docker exec dietary_backend ls -la /app/ | head -10

# Step 2: Fix permissions and install as root
echo ""
echo "Step 2: Installing dependencies as root..."
echo "========================================="

# Run as root user to install dependencies
docker exec -u root dietary_backend sh -c "
cd /app
# Install missing dependencies
npm install bcryptjs@2.4.3 jsonwebtoken@9.0.0 pg@8.10.0 --save
# Fix ownership after installation
chown -R nodejs:nodejs /app/node_modules
chmod -R 755 /app/node_modules
ls -la node_modules/ | grep bcrypt || echo 'bcryptjs not visible yet'
"

# Step 3: Verify installation
echo ""
echo "Step 3: Verifying installation..."
echo "================================="
docker exec dietary_backend sh -c "
node -e \"
try {
    const bcrypt = require('bcryptjs');
    const jwt = require('jsonwebtoken');
    const pg = require('pg');
    console.log('✓ All modules loaded successfully');
    
    // Test bcrypt
    const hash = '\\\$2b\\\$10\\\$YqVb5I2WMhPMkqUQqLMlH.oZxQ2W9Y0vBhzBqK2.vKQRxMqD0B4mS';
    bcrypt.compare('admin123', hash, (err, result) => {
        console.log('✓ Bcrypt test: admin123 password check =', result);
    });
} catch(e) {
    console.error('Module loading error:', e.message);
}
\"
"

# Step 4: Restart backend
echo ""
echo "Step 4: Restarting backend..."
echo "============================="
docker restart dietary_backend

echo "Waiting for backend to restart..."
sleep 10

# Step 5: Test authentication
echo ""
echo "Step 5: Testing authentication..."
echo "================================="

RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')

if echo "$RESPONSE" | grep -q "token"; then
    echo "✓ LOGIN SUCCESSFUL!"
    echo "$RESPONSE" | python3 -m json.tool | head -15
else
    echo "Login response: $RESPONSE"
    echo ""
    echo "Still failing. Let's check the logs:"
    docker logs dietary_backend --tail 30 | grep -E "(error|Error|MODULE|require)" || true
fi

echo ""
echo "======================================"
echo "Fix Complete!"
echo "======================================"
echo ""
echo "Go to http://localhost:3001 and login with:"
echo "  Username: admin"
echo "  Password: admin123"
echo ""
