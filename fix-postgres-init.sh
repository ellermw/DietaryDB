#!/bin/bash

echo "Fixing PostgreSQL Initialization"
echo "================================"
echo ""

# 1. Stop any running containers
echo "1. Cleaning up..."
sudo docker compose -f docker-compose-clean.yml down -v 2>/dev/null || true
sudo docker rm -f dietary_postgres dietary_backend dietary_admin 2>/dev/null || true

# 2. Create proper init.sql
echo "2. Creating proper database initialization script..."
mkdir -p database
cat > database/init.sql << 'EOF'
-- Create user and database
CREATE USER dietary_user WITH PASSWORD 'DietarySecurePass2024!';
CREATE DATABASE dietary_db OWNER dietary_user;

-- Connect to the dietary_db
\c dietary_db;

-- Grant all privileges
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

CREATE TABLE IF NOT EXISTS categories (
    category_id SERIAL PRIMARY KEY,
    category_name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS items (
    item_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    description TEXT,
    is_ada_friendly BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS patient_info (
    patient_id SERIAL PRIMARY KEY,
    patient_first_name VARCHAR(50),
    patient_last_name VARCHAR(50),
    wing VARCHAR(10),
    room_number VARCHAR(10),
    diet_type VARCHAR(50),
    ada_diet BOOLEAN DEFAULT false,
    discharged BOOLEAN DEFAULT false,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_log (
    audit_id SERIAL PRIMARY KEY,
    table_name VARCHAR(50),
    record_id INTEGER,
    action VARCHAR(20),
    changed_by VARCHAR(50),
    change_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    old_values JSONB,
    new_values JSONB
);

-- Set ownership
ALTER TABLE users OWNER TO dietary_user;
ALTER TABLE categories OWNER TO dietary_user;
ALTER TABLE items OWNER TO dietary_user;
ALTER TABLE patient_info OWNER TO dietary_user;
ALTER TABLE audit_log OWNER TO dietary_user;

-- Insert admin user (password: admin123)
INSERT INTO users (username, password, full_name, role) VALUES 
('admin', '$2b$10$YqVb5I2WMhPMkqUQqLMlH.oZxQ2W9Y0vBhzBqK2.vKQRxMqD0B4mS', 'Administrator', 'Admin')
ON CONFLICT (username) DO NOTHING;

-- Insert default categories
INSERT INTO categories (category_name, description, sort_order) VALUES
('Entrees', 'Main dishes', 1),
('Sides', 'Side dishes', 2),
('Desserts', 'Dessert options', 3),
('Beverages', 'Drinks', 4)
ON CONFLICT (category_name) DO NOTHING;
EOF

# 3. Create working docker-compose
echo "3. Creating working docker-compose configuration..."
cat > docker-compose-working.yml << 'EOF'
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: dietary_postgres
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres_admin_pwd
      POSTGRES_DB: postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 10
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
      JWT_SECRET: your-secret-key
      NODE_ENV: production
      PORT: 3000
    ports:
      - "3000:3000"
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped

  admin-frontend:
    build: ./admin-frontend
    container_name: dietary_admin
    ports:
      - "3001:3000"
    depends_on:
      - backend
    environment:
      - CHOKIDAR_USEPOLLING=true
    restart: unless-stopped

volumes:
  postgres_data:

networks:
  default:
    name: dietary_network
EOF

# 4. Start the services
echo "4. Starting services..."
sudo docker compose -f docker-compose-working.yml up -d

# 5. Wait for database to initialize
echo "5. Waiting for database initialization (15 seconds)..."
for i in {1..15}; do
    echo -n "."
    sleep 1
done
echo ""

# 6. Test services
echo ""
echo "6. Testing services:"
echo -n "PostgreSQL: "
sudo docker exec dietary_postgres pg_isready -U postgres && echo "✓ Ready" || echo "✗ Not ready"

echo -n "Database exists: "
sudo docker exec dietary_postgres psql -U postgres -lqt | grep -q dietary_db && echo "✓ Yes" || echo "✗ No"

echo -n "User exists: "
sudo docker exec dietary_postgres psql -U postgres -c "\du" | grep -q dietary_user && echo "✓ Yes" || echo "✗ No"

echo -n "Backend health: "
health=$(curl -s http://localhost:3000/api/health)
echo "$health" | grep -q "healthy" && echo "✓ Healthy" || echo "✗ Unhealthy - $health"

# 7. If health check fails, check backend logs
if ! echo "$health" | grep -q "healthy"; then
    echo ""
    echo "Backend logs:"
    sudo docker compose -f docker-compose-working.yml logs --tail=20 backend
fi

echo ""
echo "================================"
echo "Setup complete!"
echo ""
echo "Services should be available at:"
echo "- Admin Panel: http://192.168.1.74:3001"
echo "- Backend API: http://localhost:3000"
echo ""
echo "Login: admin / admin123"
echo ""
echo "Use: sudo docker compose -f docker-compose-working.yml [command]"
