#!/bin/bash
# /opt/dietarydb/diagnose-login.sh
# Quick diagnostic for login loop issue

set -e

echo "======================================"
echo "DietaryDB Login Diagnostic"
echo "======================================"
echo ""

cd /opt/dietarydb

# Check container status
echo "1. Container Status:"
echo "===================="
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep dietary || echo "No dietary containers running"
echo ""

# Check if backend has required modules
echo "2. Backend Dependencies Check:"
echo "=============================="
docker exec dietary_backend sh -c "
node -e \"
try {
    require('bcryptjs');
    console.log('✓ bcryptjs installed');
} catch(e) {
    console.log('✗ bcryptjs NOT installed');
}
try {
    require('jsonwebtoken');
    console.log('✓ jsonwebtoken installed');
} catch(e) {
    console.log('✗ jsonwebtoken NOT installed');
}
try {
    require('pg');
    console.log('✓ pg (PostgreSQL) installed');
} catch(e) {
    console.log('✗ pg NOT installed');
}
\"
" 2>/dev/null || echo "Error checking dependencies"
echo ""

# Test database connection
echo "3. Database Connection Test:"
echo "============================"
docker exec dietary_postgres psql -U dietary_user -d dietary_db -c "
SELECT username, role, is_active 
FROM users 
WHERE username = 'admin' 
LIMIT 1;
" 2>/dev/null || echo "Database connection failed"
echo ""

# Test backend API directly
echo "4. Backend API Test (Direct):"
echo "============================="
curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' 2>/dev/null | python3 -m json.tool 2>/dev/null || echo "Backend API not responding"
echo ""

# Test through nginx proxy
echo "5. Nginx Proxy Test:"
echo "===================="
curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' 2>/dev/null | python3 -m json.tool 2>/dev/null || echo "Nginx proxy not working"
echo ""

# Check for CORS issues
echo "6. CORS Headers Check:"
echo "======================"
curl -I -X OPTIONS http://localhost:3001/api/auth/login \
  -H "Origin: http://localhost:3001" \
  -H "Access-Control-Request-Method: POST" 2>/dev/null | grep -i "access-control" || echo "No CORS headers found"
echo ""

# Check backend logs for errors
echo "7. Recent Backend Errors:"
echo "========================="
docker logs dietary_backend --tail 30 2>&1 | grep -i "error\|failed\|unauthorized" | tail -5 || echo "No recent errors in logs"
echo ""

# Check frontend build status
echo "8. Frontend Status:"
echo "==================="
docker exec dietary_frontend sh -c "
if [ -d /app/build ]; then
    echo '✓ Frontend build directory exists'
    ls -la /app/build/index.html 2>/dev/null && echo '✓ index.html found' || echo '✗ index.html missing'
else
    echo '✗ Frontend not built'
fi
" 2>/dev/null || echo "Cannot check frontend status"
echo ""

echo "======================================"
echo "Diagnostic Complete!"
echo "======================================"
echo ""
echo "Common issues found:"
if ! docker exec dietary_backend sh -c "node -e \"require('bcryptjs')\"" 2>/dev/null; then
    echo "- Missing bcryptjs module (authentication will fail)"
fi
if ! docker exec dietary_backend sh -c "node -e \"require('jsonwebtoken')\"" 2>/dev/null; then
    echo "- Missing jsonwebtoken module (token generation will fail)"
fi
if ! curl -s http://localhost:3000/api/auth/login 2>/dev/null | grep -q "html"; then
    echo "- Backend API endpoint may not be configured"
fi
echo ""
echo "To fix these issues, run: ./fix-login-loop.sh"
echo ""
