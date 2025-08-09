#!/bin/bash
# /opt/dietarydb/reset-rebuild.sh
# Complete reset and rebuild of DietaryDB application

set -e

echo "======================================"
echo "DietaryDB Complete Reset & Rebuild"
echo "======================================"
echo ""
echo "WARNING: This will reset the entire application!"
echo "Press Ctrl+C to cancel or Enter to continue..."
read

cd /opt/dietarydb

# 1. Stop and remove all containers
echo ""
echo "1. Stopping and removing containers..."
echo "======================================"
docker-compose down -v
docker rm -f dietary_postgres dietary_backend dietary_admin 2>/dev/null || true

# 2. Clean Docker resources
echo ""
echo "2. Cleaning Docker resources..."
echo "==============================="
docker system prune -f

# 3. Create backup of current configuration
echo ""
echo "3. Backing up current configuration..."
echo "======================================"
mkdir -p backups/config_backup_$(date +%Y%m%d_%H%M%S)
cp -r backend/routes backups/config_backup_$(date +%Y%m%d_%H%M%S)/ 2>/dev/null || true
cp docker-compose.yml backups/config_backup_$(date +%Y%m%d_%H%M%S)/ 2>/dev/null || true

# 4. Create fresh docker-compose.yml
echo ""
echo "4. Creating fresh docker-compose.yml..."
echo "======================================="

cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: dietary_postgres
    environment:
      POSTGRES_USER: dietary_user
      POSTGRES_PASSWORD: DietarySecurePass2024!
      POSTGRES_DB: dietary_db
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U dietary_user -d dietary_db"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped
    networks:
      - dietary_net

  backend:
    build: ./backend
    container_name: dietary_backend
    environment:
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: dietary_db
      DB_USER: dietary_user
      DB_PASSWORD: DietarySecurePass2024!
      JWT_SECRET: your-super-secret-jwt-key-$(date +%s)
      NODE_ENV: production
      PORT: 3000
    volumes:
      - ./backend:/app
      - ./backups:/backups
    ports:
      - "3000:3000"
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped
    networks:
      - dietary_net

  admin-frontend:
    build: ./admin-frontend
    container_name: dietary_admin
    environment:
      - REACT_APP_API_URL=http://localhost:3000
    ports:
      - "3001:80"
    depends_on:
      - backend
    restart: unless-stopped
    networks:
      - dietary_net

volumes:
  postgres_data:

networks:
  dietary_net:
    driver: bridge
EOF

# 5. Create backend Dockerfile
echo ""
echo "5. Creating backend Dockerfile..."
echo "================================="

cat > backend/Dockerfile << 'EOF'
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application files
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3000

CMD ["node", "server.js"]
EOF

# 6. Create frontend Dockerfile
echo ""
echo "6. Creating frontend Dockerfile..."
echo "=================================="

cat > admin-frontend/Dockerfile << 'EOF'
FROM node:18-alpine as builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine

# Copy custom nginx config
COPY --from=builder /app/build /usr/share/nginx/html

# Add nginx configuration
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
    location /api { \
        proxy_pass http://backend:3000; \
        proxy_http_version 1.1; \
        proxy_set_header Upgrade $http_upgrade; \
        proxy_set_header Connection "upgrade"; \
        proxy_set_header Host $host; \
        proxy_cache_bypass $http_upgrade; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
EOF

# 7. Create complete database init script
echo ""
echo "7. Creating database initialization..."
echo "======================================"

mkdir -p database
cat > database/init.sql << 'EOF'
-- DietaryDB Fresh Database Schema

-- Create users table
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('Admin', 'User')),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    created_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create categories table
CREATE TABLE categories (
    category_id SERIAL PRIMARY KEY,
    category_name VARCHAR(100) UNIQUE NOT NULL,
    created_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create items table
CREATE TABLE items (
    item_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    is_ada_friendly BOOLEAN DEFAULT false,
    fluid_ml INTEGER,
    sodium_mg INTEGER,
    carbs_g DECIMAL(6,2),
    calories INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    modified_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_items_category ON items(category);
CREATE INDEX idx_items_active ON items(is_active);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_active ON users(is_active);

-- Insert default admin user (password: admin123)
INSERT INTO users (username, password, first_name, last_name, role) VALUES 
('admin', '$2b$10$YqVb5I2WMhPMkqUQqLMlH.oZxQ2W9Y0vBhzBqK2.vKQRxMqD0B4mS', 'System', 'Administrator', 'Admin');

-- Insert default categories
INSERT INTO categories (category_name) VALUES
('Breakfast'),
('Lunch'),
('Dinner'),
('Beverages'),
('Snacks'),
('Desserts'),
('Sides'),
('Condiments');

-- Insert sample items
INSERT INTO items (name, category, is_ada_friendly, fluid_ml, sodium_mg, carbs_g, calories) VALUES
('Scrambled Eggs', 'Breakfast', false, NULL, 180, 2, 140),
('Oatmeal', 'Breakfast', true, 240, 140, 27, 150),
('Orange Juice', 'Beverages', true, 240, 2, 26, 110),
('Grilled Chicken', 'Lunch', false, NULL, 440, 0, 165),
('Garden Salad', 'Lunch', true, NULL, 140, 10, 35),
('Apple', 'Snacks', true, NULL, 2, 25, 95);

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO dietary_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO dietary_user;
EOF

# 8. Ensure backend dependencies
echo ""
echo "8. Setting up backend dependencies..."
echo "====================================="

cd backend
npm init -y 2>/dev/null || true
npm install express cors helmet morgan compression dotenv \
  pg bcryptjs jsonwebtoken \
  express-validator multer \
  --save 2>/dev/null || true
cd ..

# 9. Build and start containers
echo ""
echo "9. Building and starting containers..."
echo "======================================"
docker-compose build --no-cache
docker-compose up -d

# 10. Wait for services
echo ""
echo "10. Waiting for services to initialize..."
echo "========================================="
sleep 20

# 11. Verify deployment
echo ""
echo "11. Verifying deployment..."
echo "==========================="

# Check containers
echo "Container Status:"
docker ps | grep dietary

# Test health endpoint
echo ""
echo "API Health Check:"
curl -s http://localhost:3000/health | python3 -m json.tool || echo "API not responding"

# Test login
echo ""
echo "Testing Login:"
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | \
  grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ ! -z "$TOKEN" ]; then
  echo "✓ Login successful"
else
  echo "✗ Login failed"
fi

echo ""
echo "======================================"
echo "Reset and Rebuild Complete!"
echo "======================================"
echo ""
echo "Application URLs:"
echo "  Admin Panel: http://localhost:3001"
echo "  API Backend: http://localhost:3000"
echo "  Database: localhost:5432"
echo ""
echo "Default Credentials:"
echo "  Username: admin"
echo "  Password: admin123"
echo ""
echo "Commands:"
echo "  View logs: docker-compose logs -f"
echo "  Stop: docker-compose down"
echo "  Start: docker-compose up -d"
echo ""
echo "If you still see issues:"
echo "1. Clear ALL browser data (cookies, cache, local storage)"
echo "2. Use a completely new incognito/private window"
echo "3. Try a different browser"
echo ""
