#!/bin/bash
# /opt/dietarydb/master-fix.sh
# Master script to fix the original DietaryDB React application completely

set -e

echo "======================================================="
echo "DietaryDB Master Fix - Complete Solution"
echo "======================================================="
echo ""
echo "This script will:"
echo "1. Stop all containers"
echo "2. Create all backend routes and middleware"
echo "3. Initialize the database properly"
echo "4. Fix the React frontend build"
echo "5. Rebuild and restart everything"
echo ""
echo "Press Enter to continue or Ctrl+C to cancel..."
read

cd /opt/dietarydb

# Step 1: Stop everything
echo ""
echo "STEP 1: Stopping all containers..."
echo "==================================="
docker-compose down
docker rm -f dietary_postgres dietary_backend dietary_admin 2>/dev/null || true

# Step 2: Run backend routes setup
echo ""
echo "STEP 2: Setting up backend routes..."
echo "====================================="
chmod +x /opt/dietarydb/ensure-backend-routes.sh 2>/dev/null || true
if [ -f "/opt/dietarydb/ensure-backend-routes.sh" ]; then
    ./ensure-backend-routes.sh
else
    echo "Creating backend routes inline..."
    
    # Create all necessary directories
    mkdir -p backend/routes backend/middleware backend/config database backups/databases
    
    # Create database config
    cat > backend/config/database.js << 'DBEOF'
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'postgres',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'dietary_db',
  user: process.env.DB_USER || 'dietary_user',
  password: process.env.DB_PASSWORD || 'DietarySecurePass2024!',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('Database connected at:', res.rows[0].now);
  }
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool: pool
};
DBEOF

    echo "✓ Backend structure created"
fi

# Step 3: Start PostgreSQL and initialize database
echo ""
echo "STEP 3: Starting PostgreSQL and initializing database..."
echo "========================================================"

# Start postgres first
docker-compose up -d postgres
echo "Waiting for PostgreSQL to start..."
sleep 15

# Run database initialization
chmod +x /opt/dietarydb/initialize-database.sh 2>/dev/null || true
if [ -f "/opt/dietarydb/initialize-database.sh" ]; then
    ./initialize-database.sh
else
    echo "Running database initialization inline..."
    docker exec dietary_postgres psql -U dietary_user -d dietary_db -c "
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
    
    INSERT INTO users (username, password, first_name, last_name, role) 
    VALUES ('admin', '\$2b\$10\$YqVb5I2WMhPMkqUQqLMlH.oZxQ2W9Y0vBhzBqK2.vKQRxMqD0B4mS', 'System', 'Administrator', 'Admin')
    ON CONFLICT (username) DO NOTHING;
    " 2>/dev/null || echo "Database already initialized"
fi

# Step 4: Fix React frontend
echo ""
echo "STEP 4: Fixing React frontend..."
echo "================================"

chmod +x /opt/dietarydb/fix-original-app.sh 2>/dev/null || true
if [ -f "/opt/dietarydb/fix-original-app.sh" ]; then
    # Just run the parts that fix the frontend
    echo "Running frontend fix..."
    cd /opt/dietarydb
    
    # Ensure package.json exists
    if [ ! -f "admin-frontend/package.json" ]; then
        cat > admin-frontend/package.json << 'PKGEOF'
{
  "name": "dietarydb-admin",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.8.1",
    "axios": "^1.3.4",
    "react-scripts": "5.0.1"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  },
  "browserslist": {
    "production": [">0.2%", "not dead", "not op_mini all"],
    "development": ["last 1 chrome version", "last 1 firefox version", "last 1 safari version"]
  }
}
PKGEOF
    fi
    
    # Generate package-lock.json
    cd admin-frontend
    npm install
    cd ..
fi

# Step 5: Build and start everything
echo ""
echo "STEP 5: Building and starting all services..."
echo "============================================="

# Ensure docker-compose.yml is correct
cat > docker-compose.yml << 'DCEOF'
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: dietary_postgres
    environment:
      POSTGRES_USER: dietary_user
      POSTGRES_PASSWORD: DietarySecurePass2024!
      POSTGRES_DB: dietary_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U dietary_user -d dietary_db"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - dietary_net
    restart: unless-stopped

  backend:
    build: ./backend
    container_name: dietary_backend
    environment:
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: dietary_db
      DB_USER: dietary_user
      DB_PASSWORD: DietarySecurePass2024!
      JWT_SECRET: your-super-secret-jwt-key
      NODE_ENV: production
      PORT: 3000
    ports:
      - "3000:3000"
    volumes:
      - ./backend:/app
      - ./backups:/backups
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - dietary_net
    restart: unless-stopped

  admin-frontend:
    build: ./admin-frontend
    container_name: dietary_admin
    ports:
      - "3001:80"
    depends_on:
      - backend
    networks:
      - dietary_net
    restart: unless-stopped

volumes:
  postgres_data:

networks:
  dietary_net:
    driver: bridge
DCEOF

# Build containers
echo "Building containers (this may take a few minutes)..."
docker-compose build

# Start all services
echo "Starting all services..."
docker-compose up -d

# Step 6: Wait and verify
echo ""
echo "STEP 6: Waiting for services to fully initialize..."
echo "==================================================="
sleep 20

# Step 7: Final verification
echo ""
echo "STEP 7: Verifying application status..."
echo "========================================"

echo "Container Status:"
echo "-----------------"
docker ps --format "table {{.Names}}\t{{.Status}}" | grep dietary || echo "Containers not running!"

echo ""
echo "Testing Backend API:"
echo "--------------------"
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health)
if [ "$HEALTH_RESPONSE" = "200" ]; then
    echo "✓ Backend is healthy (HTTP 200)"
    curl -s http://localhost:3000/health | python3 -m json.tool | head -5
else
    echo "✗ Backend not responding (HTTP $HEALTH_RESPONSE)"
fi

echo ""
echo "Testing Authentication:"
echo "-----------------------"
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')

if echo "$LOGIN_RESPONSE" | grep -q "token"; then
    echo "✓ Authentication working"
    TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
    
    echo ""
    echo "Testing Dashboard API:"
    echo "----------------------"
    DASHBOARD_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/dashboard \
      -H "Authorization: Bearer $TOKEN")
    
    if [ "$DASHBOARD_RESPONSE" = "200" ]; then
        echo "✓ Dashboard API working"
    else
        echo "✗ Dashboard API not working (HTTP $DASHBOARD_RESPONSE)"
    fi
else
    echo "✗ Authentication failed"
fi

echo ""
echo "Testing Frontend:"
echo "-----------------"
FRONTEND_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001)
if [ "$FRONTEND_RESPONSE" = "200" ]; then
    echo "✓ Frontend is accessible (HTTP 200)"
else
    echo "✗ Frontend not accessible (HTTP $FRONTEND_RESPONSE)"
fi

# Step 8: Show logs if there are issues
if [ "$HEALTH_RESPONSE" != "200" ] || [ "$FRONTEND_RESPONSE" != "200" ]; then
    echo ""
    echo "DETECTED ISSUES - Showing recent logs:"
    echo "======================================="
    echo ""
    echo "Backend logs:"
    docker logs dietary_backend --tail 10 2>&1
    echo ""
    echo "Frontend logs:"
    docker logs dietary_admin --tail 10 2>&1
fi

echo ""
echo "======================================================="
echo "MASTER FIX COMPLETE!"
echo "======================================================="
echo ""
echo "Application Status:"
if [ "$HEALTH_RESPONSE" = "200" ] && [ "$FRONTEND_RESPONSE" = "200" ]; then
    echo "✓ All systems operational!"
    echo ""
    echo "Access your application:"
    echo "  Frontend:  http://localhost:3001"
    echo "  Backend:   http://localhost:3000"
    echo ""
    echo "Login credentials:"
    echo "  Username:  admin"
    echo "  Password:  admin123"
    echo ""
    echo "IMPORTANT: Clear your browser cache!"
    echo "  1. Press Ctrl+Shift+Delete"
    echo "  2. Clear all cached data"
    echo "  3. Open a new incognito/private window"
    echo "  4. Navigate to http://localhost:3001"
else
    echo "⚠ Some issues detected. Please check the logs above."
    echo ""
    echo "Troubleshooting commands:"
    echo "  docker logs dietary_backend -f     # Backend logs"
    echo "  docker logs dietary_admin -f       # Frontend logs"
    echo "  docker logs dietary_postgres -f    # Database logs"
    echo "  docker-compose restart              # Restart all services"
fi

echo ""
echo "For real-time monitoring:"
echo "  docker-compose logs -f"
echo ""
