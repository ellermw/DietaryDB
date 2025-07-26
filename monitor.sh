#!/bin/bash

# Hospital Dietary Management System - Monitoring Script
# This script checks the health of all system components

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "Hospital Dietary Management System - Health Check"
echo "================================================"
echo "Timestamp: $(date)"
echo ""

# Function to check service
check_service() {
    local service_name=$1
    local url=$2
    local expected_response=$3
    
    printf "Checking %-20s " "$service_name..."
    
    if response=$(curl -s -f "$url" 2>/dev/null); then
        if [[ -z "$expected_response" ]] || [[ "$response" == *"$expected_response"* ]]; then
            echo -e "${GREEN}✓ OK${NC}"
            return 0
        else
            echo -e "${YELLOW}⚠ Unexpected response${NC}"
            return 1
        fi
    else
        echo -e "${RED}✗ FAILED${NC}"
        return 1
    fi
}

# Function to check container
check_container() {
    local container_name=$1
    
    printf "Checking %-20s " "$container_name container..."
    
    if docker ps --format '{{.Names}}' | grep -q "^${container_name}$"; then
        echo -e "${GREEN}✓ Running${NC}"
        return 0
    else
        echo -e "${RED}✗ Not running${NC}"
        return 1
    fi
}

# Check Docker containers
echo "Docker Containers:"
echo "-----------------"
check_container "dietary_postgres"
check_container "dietary_api"
check_container "dietary_admin"
echo ""

# Check services
echo "Service Health:"
echo "--------------"
check_service "API Health" "http://localhost:3000/health" "healthy"
check_service "API Info" "http://localhost:3000/api/system/info" "Hospital Dietary Management System"
check_service "Admin Frontend" "http://localhost:3001/health" "OK"
echo ""

# Check database connection
echo "Database Status:"
echo "---------------"
printf "Checking %-20s " "PostgreSQL..."
if docker exec dietary_postgres pg_isready -U dietary_user > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Ready${NC}"
    
    # Get database statistics
    stats=$(docker exec dietary_postgres psql -U dietary_user -d dietary_db -t -c "
        SELECT 
            (SELECT COUNT(*) FROM users) as users,
            (SELECT COUNT(*) FROM patient_info WHERE discharged = false) as active_patients,
            (SELECT COUNT(*) FROM items WHERE is_active = true) as active_items,
            (SELECT COUNT(*) FROM meal_orders WHERE order_date = CURRENT_DATE) as today_orders
    ")
    
    # Parse and display stats
    IFS='|' read -r users patients items orders <<< "$stats"
    echo "  - Active Users: $(echo $users | xargs)"
    echo "  - Active Patients: $(echo $patients | xargs)"
    echo "  - Active Items: $(echo $items | xargs)"
    echo "  - Today's Orders: $(echo $orders | xargs)"
else
    echo -e "${RED}✗ Not ready${NC}"
fi
echo ""

# Check disk space
echo "Disk Usage:"
echo "-----------"
backup_size=$(du -sh ./backups 2>/dev/null | cut -f1 || echo "0")
echo "Backup Directory: $backup_size"

# Docker disk usage
docker_disk=$(docker system df --format "table {{.Type}}\t{{.Size}}\t{{.Reclaimable}}" | tail -n +2)
echo "Docker Usage:"
echo "$docker_disk"
echo ""

# Check memory usage
echo "Memory Usage:"
echo "------------"
docker stats --no-stream --format "table {{.Container}}\t{{.MemUsage}}\t{{.MemPerc}}" dietary_postgres dietary_api dietary_admin
echo ""

# Recent errors in logs
echo "Recent Errors (last 10 minutes):"
echo "-------------------------------"
ten_minutes_ago=$(date -d '10 minutes ago' '+%Y-%m-%d %H:%M:%S')

echo "API Errors:"
docker logs dietary_api --since "10m" 2>&1 | grep -i error | tail -5 || echo "  No recent errors"

echo -e "\nDatabase Errors:"
docker logs dietary_postgres --since "10m" 2>&1 | grep -i error | tail -5 || echo "  No recent errors"
echo ""

# Network connectivity
echo "Network Status:"
echo "--------------"
api_port_check=$(netstat -tuln | grep :3000 > /dev/null 2>&1 && echo "✓ Open" || echo "✗ Closed")
admin_port_check=$(netstat -tuln | grep :3001 > /dev/null 2>&1 && echo "✓ Open" || echo "✗ Closed")
echo "API Port (3000): $api_port_check"
echo "Admin Port (3001): $admin_port_check"
echo ""

# Summary
echo "================================================"
errors=0
[[ "$api_port_check" == *"✗"* ]] && ((errors++))
[[ "$admin_port_check" == *"✗"* ]] && ((errors++))

if [[ $errors -eq 0 ]]; then
    echo -e "${GREEN}System Status: All services operational${NC}"
else
    echo -e "${RED}System Status: $errors issue(s) detected${NC}"
fi

echo "================================================"
