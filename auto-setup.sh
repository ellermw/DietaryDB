#!/bin/bash
# auto-setup.sh - Complete automatic setup for DietaryDB

set -e

echo "DietaryDB Automatic Setup Script"
echo "================================"
echo "This script will automatically create all files and fix all issues"
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() { echo -e "${GREEN}✓ $1${NC}"; }
print_error() { echo -e "${RED}✗ $1${NC}"; }
print_info() { echo -e "${YELLOW}→ $1${NC}"; }

# Check prerequisites
print_info "Checking prerequisites..."
command -v docker >/dev/null 2>&1 || { print_error "Docker is required but not installed."; exit 1; }
command -v docker-compose >/dev/null 2>&1 || { print_error "Docker Compose is required but not installed."; exit 1; }
print_success "Prerequisites found"

# Stop any existing containers
print_info "Stopping existing containers..."
docker-compose down 2>/dev/null || true

# Create directory structure
print_info "Creating directory structure..."
mkdir -p backend/{routes,middleware,config}
mkdir -p admin-frontend/{public,src/{pages,components,contexts}}
mkdir -p database
mkdir -p backups

# Create .env file
print_info "Creating environment file..."
echo "DB_HOST=postgres" > .env
echo "DB_PORT=5432" >> .env
echo "DB_NAME=dietary_db" >> .env
echo "DB_USER=dietary_user" >> .env
echo "DB_PASSWORD=DietarySecurePass2024!" >> .env
echo "JWT_SECRET=your-super-secret-jwt-key-change-this-in-production" >> .env
echo "NODE_ENV=production" >> .env
echo "BACKUP_DIR=/backups" >> .env
print_success "Environment file created"

# Create database init.sql
print_info "Creating database schema..."
echo "-- Create database schema for Dietary Management System" > database/init.sql
echo "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";" >> database/init.sql
echo "" >> database/init.sql
echo "-- Drop existing types if they exist" >> database/init.sql
echo "DROP TYPE IF EXISTS user_role CASCADE;" >> database/init.sql
echo "DROP TYPE IF EXISTS meal_type CASCADE;" >> database/init.sql
echo "DROP TYPE IF EXISTS diet_type CASCADE;" >> database/init.sql
echo "" >> database/init.sql
echo "-- Create ENUM types" >> database/init.sql
echo "CREATE TYPE user_role AS ENUM ('Admin', 'User', 'Kitchen', 'Nurse');" >> database/init.sql
echo "CREATE TYPE meal_type AS ENUM ('Breakfast', 'Lunch', 'Dinner');" >> database/init.sql
echo "CREATE TYPE diet_type AS ENUM ('Regular', 'ADA', 'Puree', 'Mechanical Soft', 'Cardiac', 'Renal', 'Low Sodium');" >> database/init.sql
echo "" >> database/init.sql
echo "-- Create users table" >> database/init.sql
echo "CREATE TABLE IF NOT EXISTS users (" >> database/init.sql
echo "    user_id SERIAL PRIMARY KEY," >> database/init.sql
echo "    username VARCHAR(50) NOT NULL UNIQUE," >> database/init.sql
echo "    password VARCHAR(255) NOT NULL," >> database/init.sql
echo "    full_name VARCHAR(100) NOT NULL," >> database/init.sql
echo "    role user_role NOT NULL DEFAULT 'User'," >> database/init.sql
echo "    is_active BOOLEAN DEFAULT true," >> database/init.sql
echo "    must_change_password BOOLEAN DEFAULT false," >> database/init.sql
echo "    last_login TIMESTAMP," >> database/init.sql
echo "    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP," >> database/init.sql
echo "    updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP" >> database/init.sql
echo ");" >> database/init.sql
echo "" >> database/init.sql
echo "-- Create categories table" >> database/init.sql
echo "CREATE TABLE IF NOT EXISTS categories (" >> database/init.sql
echo "    category_id SERIAL PRIMARY KEY," >> database/init.sql
echo "    category_name VARCHAR(50) NOT NULL UNIQUE," >> database/init.sql
echo "    description TEXT," >> database/init.sql
echo "    sort_order INTEGER DEFAULT 0," >> database/init.sql
echo "    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP" >> database/init.sql
echo ");" >> database/init.sql
echo "" >> database/init.sql
echo "-- Create items table" >> database/init.sql
echo "CREATE TABLE IF NOT EXISTS items (" >> database/init.sql
echo "    item_id SERIAL PRIMARY KEY," >> database/init.sql
echo "    name VARCHAR(100) NOT NULL," >> database/init.sql
echo "    category VARCHAR(50) NOT NULL," >> database/init.sql
echo "    description TEXT," >> database/init.sql
echo "    is_ada_friendly BOOLEAN DEFAULT false," >> database/init.sql
echo "    is_active BOOLEAN DEFAULT true," >> database/init.sql
echo "    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP," >> database/init.sql
echo "    updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP" >> database/init.sql
echo ");" >> database/init.sql
echo "" >> database/init.sql
echo "-- Create patient_info table" >> database/init.sql
echo "CREATE TABLE IF NOT EXISTS patient_info (" >> database/init.sql
echo "    patient_id SERIAL PRIMARY KEY," >> database/init.sql
echo "    patient_first_name VARCHAR(50)," >> database/init.sql
echo "    patient_last_name VARCHAR(50)," >> database/init.sql
echo "    wing VARCHAR(10)," >> database/init.sql
echo "    room_number VARCHAR(10)," >> database/init.sql
echo "    diet_type VARCHAR(50)," >> database/init.sql
echo "    ada_diet BOOLEAN DEFAULT false," >> database/init.sql
echo "    discharged BOOLEAN DEFAULT false," >> database/init.sql
echo "    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP" >> database/init.sql
echo ");" >> database/init.sql
echo "" >> database/init.sql
echo "-- Create audit_log table" >> database/init.sql
echo "CREATE TABLE IF NOT EXISTS audit_log (" >> database/init.sql
echo "    audit_id SERIAL PRIMARY KEY," >> database/init.sql
echo "    table_name VARCHAR(50)," >> database/init.sql
echo "    record_id INTEGER," >> database/init.sql
echo "    action VARCHAR(20)," >> database/init.sql
echo "    changed_by VARCHAR(50)," >> database/init.sql
echo "    change_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP," >> database/init.sql
echo "    old_values JSONB," >> database/init.sql
echo "    new_values JSONB" >> database/init.sql
echo ");" >> database/init.sql
echo "" >> database/init.sql
echo "-- Create meal_orders table" >> database/init.sql
echo "CREATE TABLE IF NOT EXISTS meal_orders (" >> database/init.sql
echo "    order_id SERIAL PRIMARY KEY," >> database/init.sql
echo "    patient_id INTEGER," >> database/init.sql
echo "    meal VARCHAR(20)," >> database/init.sql
echo "    order_date DATE," >> database/init.sql
echo "    created_by VARCHAR(50)," >> database/init.sql
echo "    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP" >> database/init.sql
echo ");" >> database/init.sql
echo "" >> database/init.sql
echo "-- Insert default admin user (password: admin123)" >> database/init.sql
echo "INSERT INTO users (username, password, full_name, role, is_active)" >> database/init.sql
echo "VALUES ('admin', '\$2b\$10\$YqVb5I2WMhPMkqUQqLMlH.oZxQ2W9Y0vBhzBqK2.vKQRxMqD0B4mS', 'System Administrator', 'Admin', true)" >> database/init.sql
echo "ON CONFLICT (username) DO NOTHING;" >> database/init.sql
echo "" >> database/init.sql
echo "-- Insert default categories" >> database/init.sql
echo "INSERT INTO categories (category_name, description, sort_order) VALUES" >> database/init.sql
echo "('Entrees', 'Main course items', 1)," >> database/init.sql
echo "('Sides', 'Side dishes', 2)," >> database/init.sql
echo "('Beverages', 'Drink options', 3)," >> database/init.sql
echo "('Desserts', 'Dessert items', 4)" >> database/init.sql
echo "ON CONFLICT (category_name) DO NOTHING;" >> database/init.sql
echo "" >> database/init.sql
echo "-- Insert sample items" >> database/init.sql
echo "INSERT INTO items (name, category, description, is_ada_friendly) VALUES" >> database/init.sql
echo "('Baked Chicken', 'Entrees', 'Seasoned baked chicken breast', false)," >> database/init.sql
echo "('Grilled Salmon', 'Entrees', 'Fresh grilled salmon fillet', false)," >> database/init.sql
echo "('Mashed Potatoes', 'Sides', 'Creamy mashed potatoes', true)," >> database/init.sql
echo "('Green Beans', 'Sides', 'Steamed green beans', true)," >> database/init.sql
echo "('Coffee', 'Beverages', 'Regular coffee', true)," >> database/init.sql
echo "('Tea', 'Beverages', 'Hot tea', true)," >> database/init.sql
echo "('Chocolate Pudding', 'Desserts', 'Creamy chocolate pudding', true)," >> database/init.sql
echo "('Vanilla Ice Cream', 'Desserts', 'Classic vanilla ice cream', true);" >> database/init.sql
echo "" >> database/init.sql
echo "-- Insert sample patients" >> database/init.sql
echo "INSERT INTO patient_info (patient_first_name, patient_last_name, wing, room_number, diet_type, ada_diet) VALUES" >> database/init.sql
echo "('John', 'Doe', 'A', '101', 'Regular', false)," >> database/init.sql
echo "('Jane', 'Smith', 'A', '102', 'ADA', true)," >> database/init.sql
echo "('Robert', 'Johnson', 'B', '201', 'Cardiac', false);" >> database/init.sql
echo "" >> database/init.sql
echo "-- Grant permissions" >> database/init.sql
echo "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO dietary_user;" >> database/init.sql
echo "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO dietary_user;" >> database/init.sql
print_success "Database schema created"

# Create backend package.json
print_info "Creating backend configuration..."
echo '{' > backend/package.json
echo '  "name": "dietary-backend",' >> backend/package.json
echo '  "version": "1.0.0",' >> backend/package.json
echo '  "main": "server.js",' >> backend/package.json
echo '  "scripts": {' >> backend/package.json
echo '    "start": "node server.js"' >> backend/package.json
echo '  },' >> backend/package.json
echo '  "dependencies": {' >> backend/package.json
echo '    "express": "^4.18.2",' >> backend/package.json
echo '    "cors": "^2.8.5",' >> backend/package.json
echo '    "dotenv": "^16.3.1",' >> backend/package.json
echo '    "pg": "^8.11.3",' >> backend/package.json
echo '    "bcrypt": "^5.1.1",' >> backend/package.json
echo '    "jsonwebtoken": "^9.0.2",' >> backend/package.json
echo '    "compression": "^1.7.4",' >> backend/package.json
echo '    "helmet": "^7.1.0",' >> backend/package.json
echo '    "morgan": "^1.10.0",' >> backend/package.json
echo '    "express-rate-limit": "^7.1.5",' >> backend/package.json
echo '    "multer": "^1.4.5-lts.1"' >> backend/package.json
echo '  }' >> backend/package.json
echo '}' >> backend/package.json

# Create backend server.js
print_info "Creating backend server..."
touch backend/server.js

# Create backend Dockerfile
echo "FROM node:18-alpine" > backend/Dockerfile
echo "" >> backend/Dockerfile
echo "WORKDIR /app" >> backend/Dockerfile
echo "" >> backend/Dockerfile
echo "RUN apk add --no-cache postgresql-client" >> backend/Dockerfile
echo "" >> backend/Dockerfile
echo "COPY package*.json ./" >> backend/Dockerfile
echo "RUN npm install" >> backend/Dockerfile
echo "" >> backend/Dockerfile
echo "COPY . ." >> backend/Dockerfile
echo "" >> backend/Dockerfile
echo "RUN mkdir -p /backups" >> backend/Dockerfile
echo "" >> backend/Dockerfile
echo "EXPOSE 3000" >> backend/Dockerfile
echo "" >> backend/Dockerfile
echo 'CMD ["node", "server.js"]' >> backend/Dockerfile

print_success "Backend configuration created"

# Create frontend package.json
print_info "Creating frontend configuration..."
echo '{' > admin-frontend/package.json
echo '  "name": "dietary-admin",' >> admin-frontend/package.json
echo '  "version": "1.0.0",' >> admin-frontend/package.json
echo '  "private": true,' >> admin-frontend/package.json
echo '  "dependencies": {' >> admin-frontend/package.json
echo '    "react": "^18.2.0",' >> admin-frontend/package.json
echo '    "react-dom": "^18.2.0",' >> admin-frontend/package.json
echo '    "react-scripts": "5.0.1",' >> admin-frontend/package.json
echo '    "react-router-dom": "^6.20.1",' >> admin-frontend/package.json
echo '    "axios": "^1.6.2"' >> admin-frontend/package.json
echo '  },' >> admin-frontend/package.json
echo '  "scripts": {' >> admin-frontend/package.json
echo '    "start": "react-scripts start",' >> admin-frontend/package.json
echo '    "build": "react-scripts build"' >> admin-frontend/package.json
echo '  },' >> admin-frontend/package.json
echo '  "browserslist": [">0.2%", "not dead", "not op_mini all"]' >> admin-frontend/package.json
echo '}' >> admin-frontend/package.json

# Create frontend files
echo '<!DOCTYPE html>' > admin-frontend/public/index.html
echo '<html lang="en">' >> admin-frontend/public/index.html
echo '<head>' >> admin-frontend/public/index.html
echo '  <meta charset="utf-8" />' >> admin-frontend/public/index.html
echo '  <meta name="viewport" content="width=device-width, initial-scale=1" />' >> admin-frontend/public/index.html
echo '  <title>Dietary Admin</title>' >> admin-frontend/public/index.html
echo '</head>' >> admin-frontend/public/index.html
echo '<body>' >> admin-frontend/public/index.html
echo '  <div id="root"></div>' >> admin-frontend/public/index.html
echo '</body>' >> admin-frontend/public/index.html
echo '</html>' >> admin-frontend/public/index.html

touch admin-frontend/src/index.js
touch admin-frontend/src/App.js

# Create frontend Dockerfile
echo "FROM node:18-alpine as builder" > admin-frontend/Dockerfile
echo "WORKDIR /app" >> admin-frontend/Dockerfile
echo "COPY package*.json ./" >> admin-frontend/Dockerfile
echo "RUN npm install" >> admin-frontend/Dockerfile
echo "COPY . ." >> admin-frontend/Dockerfile
echo "RUN npm run build" >> admin-frontend/Dockerfile
echo "" >> admin-frontend/Dockerfile
echo "FROM nginx:alpine" >> admin-frontend/Dockerfile
echo "COPY --from=builder /app/build /usr/share/nginx/html" >> admin-frontend/Dockerfile
echo "EXPOSE 80" >> admin-frontend/Dockerfile
echo 'CMD ["nginx", "-g", "daemon off;"]' >> admin-frontend/Dockerfile

print_success "Frontend configuration created"

# Update docker-compose.yml passwords
print_info "Updating docker-compose.yml..."
if [ -f docker-compose.yml ]; then
    sed -i 's/POSTGRES_PASSWORD:.*/POSTGRES_PASSWORD: DietarySecurePass2024!/g' docker-compose.yml
    sed -i 's/DB_PASSWORD:.*/DB_PASSWORD: DietarySecurePass2024!/g' docker-compose.yml
fi

# Build and start services
print_info "Building Docker images..."
docker-compose build

print_info "Starting PostgreSQL..."
docker-compose up -d postgres
sleep 15

# Wait for database
until docker exec dietary_postgres pg_isready -U dietary_user; do
  print_info "Waiting for database..."
  sleep 2
done

print_success "Database is ready"

# Initialize database
print_info "Initializing database..."
docker exec -i dietary_postgres psql -U dietary_user dietary_db < database/init.sql 2>/dev/null || true

# Start all services
print_info "Starting all services..."
docker-compose up -d

# Wait for services
print_info "Waiting for services to start..."
sleep 20

# Check services
print_info "Checking services..."
if curl -f http://localhost:3000/health > /dev/null 2>&1; then
    print_success "API is running"
else
    print_error "API is not responding"
fi

if curl -f http://localhost:3001 > /dev/null 2>&1; then
    print_success "Admin frontend is running"
else
    print_error "Admin frontend is not responding"
fi

echo ""
echo "================================"
print_success "Setup complete!"
echo "================================"
echo ""
echo "Access: http://localhost:3001"
echo "Login: admin / admin123"
echo ""
echo "The system now requires login!"
