#!/bin/bash

# Quick fix script for the current build issue
echo "Applying quick fix for Docker build issue..."

# Stop and remove all containers
echo "→ Stopping containers..."
sudo docker-compose down --remove-orphans

# Clean up specific orphan containers
echo "→ Removing orphan containers..."
sudo docker rm -f dietary_admin dietary_api 2>/dev/null || true

# Generate package-lock.json for backend
echo "→ Generating backend package-lock.json..."
cd backend
npm install
cd ..

# Generate package-lock.json for frontend
echo "→ Generating frontend package-lock.json..."
cd admin-frontend
npm install
cd ..

# Now build and run
echo "→ Building and starting containers..."
sudo docker-compose up --build -d

echo ""
echo "✓ Fix applied! Services should be starting..."
echo ""
echo "Check status with: sudo docker-compose ps"
echo "View logs with: sudo docker-compose logs -f"
