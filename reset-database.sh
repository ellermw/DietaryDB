#!/bin/bash

echo "Complete Database Reset"
echo "======================"
echo ""
echo "⚠️  WARNING: This will delete all data and start fresh!"
echo "Press Ctrl+C to cancel, or Enter to continue..."
read

# 1. Stop everything
echo "1. Stopping all containers..."
sudo docker compose -f docker-compose-fixed.yml down -v
sudo docker compose down -v

# 2. Remove ALL volumes
echo "2. Removing all database volumes..."
sudo docker volume rm dietarydb_postgres_data 2>/dev/null || true
sudo docker volume rm dietary_postgres_data 2>/dev/null || true
sudo docker volume ls | grep dietary | awk '{print $2}' | xargs -r sudo docker volume rm

# 3. Remove any local postgres data
echo "3. Removing local data..."
sudo rm -rf postgres_data/
sudo rm -rf ./postgres_data/

# 4. Create fresh init.sql with correct password
echo "4. Creating fresh database init script..."
mkdir -p database
cat > database/init.sql << 'EOF'
-- Create database user with correct password
CREATE USER dietary_user WITH PASSWORD 'DietarySecurePass2024!';

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE dietary_db TO dietary_user;
GRANT ALL ON SCHEMA public TO dietary_user;

-- Create tables
CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'User',
    is_active BOOLEAN DEFAULT true,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert admin user (password: admin123)
INSERT INTO users (username, password, full_name, role) VALUES 
('admin', '$2b$10$YqVb5I2WMhPMkqUQqLMlH.oZxQ2W9Y0vBhzBqK2.vKQRxMqD0B4mS', 'Administrator', 'Admin')
ON CONFLICT (username) DO NOTHING;
EOF

# 5. Create a simplified docker-compose
echo "5. Creating clean docker-compose configuration..."
cat > docker-compose-clean.yml << 'EOF'
services:
  postgres:
    image: postgres:15-alpine
    container_name: dietary_postgres
    environment:
      POSTGRES_USER: dietary_user
      POSTGRES_PASSWORD: DietarySecurePass2024!
      POSTGRES_DB: dietary_db
    volumes:
      - ./database/init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U dietary_user -d dietary_db"]
      interval: 5s
      timeout: 5s
      retries: 10

  backend:
    build: ./backend
    container_name: dietary_backend
    environment:
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: dietary_db
      DB_USER: dietary_user
      DB_PASSWORD: DietarySecurePass2024!
      JWT_SECRET: your-secret-key
      NODE_ENV: production
      PORT: 3000
    ports:
      - "3000:3000"
    depends_on:
      postgres:
        condition: service_healthy

  admin-frontend:
    build: ./admin-frontend
    container_name: dietary_admin
    ports:
      - "3001:3000"
    depends_on:
      - backend
    environment:
      - CHOKIDAR_USEPOLLING=true
EOF

# 6. Start fresh
echo "6. Starting fresh containers..."
sudo docker compose -f docker-compose-clean.yml up -d

# 7. Wait for initialization
echo "7. Waiting for database initialization (20 seconds)..."
sleep 20

# 8. Test everything
echo "8. Testing services:"
echo -n "Database: "
sudo docker exec dietary_postgres pg_isready -U dietary_user -d dietary_db && echo "✓ Ready" || echo "✗ Not ready"

echo -n "Backend health: "
curl -s http://localhost:3000/api/health | grep -q "healthy" && echo "✓ Healthy" || echo "✗ Unhealthy"

echo ""
echo "9. Testing login:"
response=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')
echo "$response" | grep -q "token" && echo "✓ Login successful!" || echo "✗ Login failed: $response"

echo ""
echo "======================"
echo "Fresh installation complete!"
echo ""
echo "Admin panel: http://192.168.1.74:3001"
echo "Login: admin / admin123"
echo ""
echo "Use this command for all future operations:"
echo "sudo docker compose -f docker-compose-clean.yml [command]"
