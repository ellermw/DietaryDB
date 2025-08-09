#!/bin/bash
# /opt/dietarydb/diagnose-issues.sh
# Diagnostic script to identify DietaryDB issues

set -e

echo "======================================"
echo "DietaryDB Diagnostic Script"
echo "======================================"

cd /opt/dietarydb

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check function
check_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $2"
        return 0
    else
        echo -e "${RED}✗${NC} $2"
        return 1
    fi
}

# 1. Check Docker status
echo ""
echo "1. Docker Status:"
echo "================="
docker --version && check_status $? "Docker installed" || check_status $? "Docker not found"

# 2. Check containers
echo ""
echo "2. Container Status:"
echo "==================="
POSTGRES_RUNNING=$(docker ps | grep -c dietary_postgres || true)
BACKEND_RUNNING=$(docker ps | grep -c dietary_backend || true)
FRONTEND_RUNNING=$(docker ps | grep -c dietary_admin || true)

check_status $POSTGRES_RUNNING "PostgreSQL container running"
check_status $BACKEND_RUNNING "Backend container running"
check_status $FRONTEND_RUNNING "Frontend container running"

# 3. Check port availability
echo ""
echo "3. Port Status:"
echo "==============="
nc -zv localhost 3000 2>&1 | grep -q succeeded && check_status 0 "Backend port 3000 accessible" || check_status 1 "Backend port 3000 not accessible"
nc -zv localhost 3001 2>&1 | grep -q succeeded && check_status 0 "Frontend port 3001 accessible" || check_status 1 "Frontend port 3001 not accessible"
nc -zv localhost 5432 2>&1 | grep -q succeeded && check_status 0 "PostgreSQL port 5432 accessible" || check_status 1 "PostgreSQL port 5432 not accessible"

# 4. Check API health
echo ""
echo "4. API Health:"
echo "=============="
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health 2>/dev/null || echo "000")
if [ "$HEALTH_RESPONSE" = "200" ]; then
    check_status 0 "API health endpoint responding"
    curl -s http://localhost:3000/health | python3 -m json.tool 2>/dev/null || true
else
    check_status 1 "API health endpoint not responding (HTTP $HEALTH_RESPONSE)"
fi

# 5. Test CORS headers
echo ""
echo "5. CORS Configuration:"
echo "====================="
CORS_HEADERS=$(curl -s -I -X OPTIONS http://localhost:3000/api/test 2>/dev/null | grep -i "access-control" || echo "No CORS headers found")
if echo "$CORS_HEADERS" | grep -q "Access-Control-Allow-Origin"; then
    check_status 0 "CORS headers present"
    echo "$CORS_HEADERS"
else
    check_status 1 "CORS headers missing"
fi

# 6. Test authentication
echo ""
echo "6. Authentication Test:"
echo "======================"
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' 2>/dev/null)

if echo "$LOGIN_RESPONSE" | grep -q "token"; then
    check_status 0 "Login endpoint working"
    TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
    echo "Token received: ${TOKEN:0:20}..."
else
    check_status 1 "Login endpoint failed"
    echo "Response: $LOGIN_RESPONSE"
fi

# 7. Check database connection
echo ""
echo "7. Database Connection:"
echo "======================"
DB_CHECK=$(docker exec dietary_postgres psql -U dietary_user -d dietary_db -c "SELECT 1;" 2>&1 || echo "Failed")
if echo "$DB_CHECK" | grep -q "1 row"; then
    check_status 0 "Database connection successful"
    
    # Check tables
    echo ""
    echo "Database tables:"
    docker exec dietary_postgres psql -U dietary_user -d dietary_db -c "\dt" 2>/dev/null | grep -E "(users|items)" || echo "No tables found"
else
    check_status 1 "Database connection failed"
fi

# 8. Check backend logs for errors
echo ""
echo "8. Recent Backend Errors:"
echo "========================"
BACKEND_ERRORS=$(docker logs dietary_backend --tail 50 2>&1 | grep -i error | tail -5 || echo "No recent errors")
if [ "$BACKEND_ERRORS" = "No recent errors" ]; then
    check_status 0 "No recent backend errors"
else
    check_status 1 "Backend errors found:"
    echo "$BACKEND_ERRORS"
fi

# 9. Check file permissions
echo ""
echo "9. File Permissions:"
echo "==================="
[ -r backend/server.js ] && check_status 0 "backend/server.js readable" || check_status 1 "backend/server.js not readable"
[ -r docker-compose.yml ] && check_status 0 "docker-compose.yml readable" || check_status 1 "docker-compose.yml not readable"
[ -d backups ] && check_status 0 "backups directory exists" || check_status 1 "backups directory missing"

# 10. Summary and recommendations
echo ""
echo "======================================"
echo "Diagnostic Summary:"
echo "======================================"

ISSUES=0

if [ $POSTGRES_RUNNING -eq 0 ]; then
    echo -e "${RED}Issue:${NC} PostgreSQL container not running"
    echo "  Fix: docker-compose up -d postgres"
    ISSUES=$((ISSUES + 1))
fi

if [ $BACKEND_RUNNING -eq 0 ]; then
    echo -e "${RED}Issue:${NC} Backend container not running"
    echo "  Fix: docker-compose up -d backend"
    ISSUES=$((ISSUES + 1))
fi

if [ $FRONTEND_RUNNING -eq 0 ]; then
    echo -e "${RED}Issue:${NC} Frontend container not running"
    echo "  Fix: docker-compose up -d admin-frontend"
    ISSUES=$((ISSUES + 1))
fi

if [ "$HEALTH_RESPONSE" != "200" ]; then
    echo -e "${RED}Issue:${NC} API not responding"
    echo "  Fix: Check backend logs: docker logs dietary_backend"
    ISSUES=$((ISSUES + 1))
fi

if [ $ISSUES -eq 0 ]; then
    echo -e "${GREEN}All systems operational!${NC}"
else
    echo ""
    echo -e "${YELLOW}Found $ISSUES issue(s). Run the fix script:${NC}"
    echo "  chmod +x /opt/dietarydb/fix-backend-issues.sh"
    echo "  /opt/dietarydb/fix-backend-issues.sh"
fi

echo ""
echo "For detailed logs, run:"
echo "  docker logs dietary_backend -f"
echo "  docker logs dietary_postgres -f"
echo "  docker logs dietary_admin -f"
