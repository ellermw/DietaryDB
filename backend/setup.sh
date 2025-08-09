#!/bin/bash

echo "Setting up DietaryDB System..."

# Check prerequisites
command -v docker >/dev/null 2>&1 || { echo "Docker is required but not installed."; exit 1; }

# Check for docker compose (try both versions)
if command -v docker-compose >/dev/null 2>&1; then
    DOCKER_COMPOSE="docker-compose"
elif docker compose version >/dev/null 2>&1; then
    DOCKER_COMPOSE="docker compose"
else
    echo "Docker Compose is required but not installed."
    exit 1
fi

echo "Using Docker Compose command: $DOCKER_COMPOSE"

# Create necessary directories
mkdir -p backups

# Set permissions
chmod 755 migration/migrate-sqlite-to-postgres.py 2>/dev/null || true

# Pull images
echo "Pulling Docker images..."
$DOCKER_COMPOSE pull

# Start services
echo "Starting services..."
$DOCKER_COMPOSE up -d

# Wait for database to be ready
echo "Waiting for database initialization..."
sleep 15

# Check health
echo "Checking service health..."
curl -f http://localhost:3000/health || echo "API health check failed"
curl -f http://localhost:3001 || echo "Admin frontend health check failed"

echo ""
echo "Setup completed!"
echo "API: http://localhost:3000"
echo "Admin Panel: http://localhost:3001"
echo "Default login: admin / admin123"
echo ""
echo "To view logs: $DOCKER_COMPOSE logs -f"
echo "To stop services: $DOCKER_COMPOSE down"
