#!/bin/bash

echo "Direct Backend Fix"
echo "=================="
echo ""

# The simplest solution - hardcode the password in docker-compose.yml
echo "1. Hardcoding database password in docker-compose.yml..."

cat > docker-compose-fixed.yml << 'EOF'
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
    build: 
      context: ./backend
      dockerfile: Dockerfile
    container_name: dietary_backend
    environment:
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: dietary_db
      DB_USER: dietary_user
      DB_PASSWORD: DietarySecurePass2024!
      JWT_SECRET: your-super-secret-jwt-key-change-this
      NODE_ENV: production
      PORT: 3000
    volumes:
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
    build: 
      context: ./admin-frontend
      dockerfile: Dockerfile
    container_name: dietary_admin
    environment:
      - CHOKIDAR_USEPOLLING=true
      - REACT_APP_API_URL=http://localhost:3000
    volumes:
      - ./admin-frontend/src:/app/src
      - ./admin-frontend/public:/app/public
    ports:
      - "3001:3000"
    depends_on:
      - backend
    restart: unless-stopped
    stdin_open: true
    tty: true
    networks:
      - dietary_net

volumes:
  postgres_data:
    driver: local

networks:
  dietary_net:
    driver: bridge
EOF

echo "2. Restarting with fixed configuration..."
sudo docker compose -f docker-compose-fixed.yml down
sudo docker compose -f docker-compose-fixed.yml up -d

echo ""
echo "3. Waiting for services to start..."
sleep 10

echo ""
echo "4. Testing backend health:"
curl http://localhost:3000/api/health

echo ""
echo "5. Testing login:"
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  -s | jq . || echo "Login test complete"

echo ""
echo "=================="
echo "If health check shows 'healthy', you can now login at:"
echo "http://192.168.1.74:3001"
echo ""
echo "Use: sudo docker compose -f docker-compose-fixed.yml [command]"
echo "for future operations."
