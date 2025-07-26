#!/bin/bash

# Hospital Dietary Management System - Setup Script
# This script helps with initial deployment setup

set -e

echo "Hospital Dietary Management System - Setup Script"
echo "================================================="

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   echo "This script should not be run as root!"
   exit 1
fi

# Check prerequisites
echo "Checking prerequisites..."

command -v docker >/dev/null 2>&1 || { echo "Docker is required but not installed. Aborting." >&2; exit 1; }
command -v docker-compose >/dev/null 2>&1 || { echo "Docker Compose is required but not installed. Aborting." >&2; exit 1; }
command -v python3 >/dev/null 2>&1 || { echo "Python 3 is required but not installed. Aborting." >&2; exit 1; }

echo "✓ All prerequisites met"

# Check if essential files exist
echo -e "\nChecking for essential files..."
missing_files=0

# Check for key backend files
if [ ! -f "backend/server.js" ]; then
    echo "✗ backend/server.js is missing"
    missing_files=$((missing_files + 1))
fi

if [ ! -f "backend/package.json" ]; then
    echo "✗ backend/package.json is missing"
    missing_files=$((missing_files + 1))
fi

# Check for key frontend files
if [ ! -f "admin-frontend/src/App.js" ]; then
    echo "✗ admin-frontend/src/App.js is missing"
    missing_files=$((missing_files + 1))
fi

if [ ! -f "admin-frontend/src/pages/Login.js" ]; then
    echo "✗ admin-frontend/src/pages/Login.js is missing"
    missing_files=$((missing_files + 1))
fi

if [ ! -f "database/init.sql" ]; then
    echo "✗ database/init.sql is missing"
    missing_files=$((missing_files + 1))
fi

if [ $missing_files -gt 0 ]; then
    echo -e "\n❌ Essential files are missing!"
    echo "Please run the following command first:"
    echo "  chmod +x quick-start.sh && ./quick-start.sh"
    echo "Or manually copy all files from the artifacts."
    exit 1
fi

echo "✓ Essential files found"

# Create directory structure
echo -e "\nCreating directory structure..."
mkdir -p backend/{routes,middleware,config}
mkdir -p admin-frontend/src/{pages,components,contexts}
mkdir -p admin-frontend/public
mkdir -p database
mkdir -p migration
mkdir -p backups

echo "✓ Directory structure created"

# Create placeholder pages that are referenced but not yet created
echo -e "\nCreating placeholder files..."
cat > admin-frontend/src/pages/Patients.js << 'EOF'
import React from 'react';

function Patients() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Patients</h1>
      <p className="mt-4 text-gray-600">Patient management interface coming soon...</p>
    </div>
  );
}

export default Patients;
EOF

cat > admin-frontend/src/pages/Items.js << 'EOF'
import React from 'react';

function Items() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Food Items</h1>
      <p className="mt-4 text-gray-600">Food item management interface coming soon...</p>
    </div>
  );
}

export default Items;
EOF

cat > admin-frontend/src/pages/Orders.js << 'EOF'
import React from 'react';

function Orders() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
      <p className="mt-4 text-gray-600">Order management interface coming soon...</p>
    </div>
  );
}

export default Orders;
EOF

cat > admin-frontend/src/pages/DefaultMenus.js << 'EOF'
import React from 'react';

function DefaultMenus() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Default Menus</h1>
      <p className="mt-4 text-gray-600">Menu configuration interface coming soon...</p>
    </div>
  );
}

export default DefaultMenus;
EOF

cat > admin-frontend/src/pages/Users.js << 'EOF'
import React from 'react';

function Users() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Users</h1>
      <p className="mt-4 text-gray-600">User management interface coming soon...</p>
    </div>
  );
}

export default Users;
EOF

cat > admin-frontend/src/pages/AuditLogs.js << 'EOF'
import React from 'react';

function AuditLogs() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
      <p className="mt-4 text-gray-600">Audit log viewer coming soon...</p>
    </div>
  );
}

export default AuditLogs;
EOF

echo "✓ Placeholder files created"

# Generate secure passwords and secrets
echo -e "\nGenerating secure credentials..."
DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
JWT_SECRET=$(openssl rand -base64 32)

# Create .env file
echo -e "\nCreating environment configuration..."
cat > .env << EOF
# Database Configuration
DB_HOST=postgres
DB_PORT=5432
DB_NAME=dietary_db
DB_USER=dietary_user
DB_PASSWORD=${DB_PASSWORD}

# API Configuration
PORT=3000
NODE_ENV=production

# JWT Configuration
JWT_SECRET=${JWT_SECRET}

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3001,http://localhost:3000

# Backup Configuration
BACKUP_DIR=/backups
EOF

# Copy .env to backend directory
cp .env backend/.env

echo "✓ Environment configuration created"

# Update docker-compose.yml with generated password
echo -e "\nUpdating Docker configuration..."
sed -i "s/DietaryP@ssw0rd2024/${DB_PASSWORD}/g" docker-compose.yml
sed -i "s/DietaryP@ssw0rd2024/${DB_PASSWORD}/g" database/init.sql

# Create backup directory with proper permissions
echo -e "\nSetting up backup directory..."
mkdir -p ./backups
chmod 755 ./backups

# Pull Docker images
echo -e "\nPulling Docker images..."
docker-compose pull

# Initialize database
echo -e "\nInitializing database..."
docker-compose up -d postgres
echo "Waiting for PostgreSQL to start..."
sleep 10

# Check if database is ready
until docker exec dietary_postgres pg_isready -U dietary_user; do
  echo "Waiting for database to be ready..."
  sleep 2
done

echo "✓ Database initialized"

# Start all services
echo -e "\nStarting all services..."
docker-compose up -d

# Wait for services to be ready
echo "Waiting for services to start..."
sleep 10

# Check service health
echo -e "\nChecking service health..."
if curl -f http://localhost:3000/health > /dev/null 2>&1; then
    echo "✓ API is healthy"
else
    echo "✗ API health check failed"
fi

if curl -f http://localhost:3001/health > /dev/null 2>&1; then
    echo "✓ Admin frontend is healthy"
else
    echo "✗ Admin frontend health check failed"
fi

# Display connection information
echo -e "\n================================================="
echo "Setup completed successfully!"
echo "================================================="
echo -e "\nConnection Information:"
echo "- API URL: http://$(hostname -I | awk '{print $1}'):3000"
echo "- Admin URL: http://$(hostname -I | awk '{print $1}'):3001"
echo -e "\nDefault Admin Credentials:"
echo "- Username: admin"
echo "- Password: admin123 (change immediately!)"
echo -e "\nDatabase Credentials:"
echo "- Host: localhost"
echo "- Port: 5432"
echo "- Database: dietary_db"
echo "- Username: dietary_user"
echo "- Password: ${DB_PASSWORD}"
echo -e "\nIMPORTANT:"
echo "1. Save these credentials securely"
echo "2. Change the admin password immediately"
echo "3. Configure firewall rules for ports 3000 and 3001"
echo "4. Set up SSL/HTTPS for production use"
echo -e "\nTo view logs:"
echo "docker-compose logs -f"
echo -e "\nTo stop services:"
echo "docker-compose down"
