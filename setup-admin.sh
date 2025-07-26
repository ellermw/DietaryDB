#!/bin/bash

# Setup script for Dietary Admin Dashboard
set -e

echo "==============================================="
echo "   Dietary Admin Dashboard Setup Script        "
echo "==============================================="
echo ""

# Check if running with sudo
if [ "$EUID" -eq 0 ]; then 
   echo "✓ Running with sudo privileges"
else
   echo "✗ This script needs to be run with sudo"
   exit 1
fi

# Clean up orphan containers
echo "→ Cleaning up orphan containers..."
docker-compose down --remove-orphans 2>/dev/null || true
docker rm -f dietary_admin dietary_api dietary_postgres 2>/dev/null || true

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "→ Creating .env file from template..."
    cp .env.example .env
    echo "✓ .env file created. Please edit it with your settings."
else
    echo "✓ .env file already exists"
fi

# Create necessary directories
echo "→ Creating directories..."
mkdir -p backend
mkdir -p admin-frontend/src/pages
mkdir -p admin-frontend/public
mkdir -p database
mkdir -p backups

# Set permissions for backups directory
echo "→ Setting permissions..."
chmod 777 backups

# Generate package-lock.json files
echo "→ Generating package-lock.json files..."
cd backend
npm install
cd ../admin-frontend
npm install
cd ..

echo ""
echo "==============================================="
echo "   Starting Docker Compose                     "
echo "==============================================="
echo ""

# Build and start containers
docker-compose up --build -d

echo ""
echo "==============================================="
echo "   Setup Complete!                             "
echo "==============================================="
echo ""
echo "Services are starting up. Please wait a moment..."
echo ""
echo "Access the admin dashboard at:"
echo "  → http://localhost:3001"
echo ""
echo "Default credentials:"
echo "  Username: admin"
echo "  Password: admin123"
echo ""
echo "API endpoint:"
echo "  → http://localhost:3000"
echo ""
echo "To view logs:"
echo "  docker-compose logs -f"
echo ""
echo "To stop services:"
echo "  docker-compose down"
echo ""
