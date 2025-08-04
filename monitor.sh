#!/bin/bash

echo "DietaryDB System Health Check"
echo "============================"
echo ""

# Function to check service
check_service() {
    local name=$1
    local url=$2
    local expected=$3
    
    printf "Checking %-20s " "$name..."
    
    if curl -s -f "$url" | grep -q "$expected" 2>/dev/null; then
        echo "✓ OK"
    else
        echo "✗ FAILED"
    fi
}

# Check containers
echo "Container Status:"
echo "-----------------"
docker-compose ps

echo ""
echo "Service Health:"
echo "---------------"
check_service "API Health" "http://localhost:3000/health" "healthy"
check_service "API Info" "http://localhost:3000/api/system/info" "Hospital Dietary"
check_service "Admin Frontend" "http://localhost:3001" "<!DOCTYPE html>"

echo ""
echo "Database Status:"
echo "----------------"
docker exec dietary_postgres pg_isready -U dietary_user && echo "✓ PostgreSQL is ready" || echo "✗ PostgreSQL is not ready"

# Get database statistics
echo ""
echo "Database Statistics:"
echo "-------------------"
docker exec dietary_postgres psql -U dietary_user -d dietary_db -c "
SELECT 
    (SELECT COUNT(*) FROM users) as users,
    (SELECT COUNT(*) FROM patient_info WHERE discharged = false) as active_patients,
    (SELECT COUNT(*) FROM items WHERE is_active = true) as active_items,
    (SELECT COUNT(*) FROM meal_orders WHERE order_date = CURRENT_DATE) as today_orders
" 2>/dev/null || echo "Could not fetch statistics"

echo ""
echo "Disk Usage:"
echo "-----------"
du -sh backups/ 2>/dev/null || echo "Backup directory not found"

echo ""
echo "Recent Logs:"
echo "------------"
docker-compose logs --tail=5 2>/dev/null | grep -i error || echo "No recent errors"