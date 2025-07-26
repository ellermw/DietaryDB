#!/bin/bash

echo "Setting up Full React Admin Dashboard..."
echo "======================================="
echo ""

# 1. Create all necessary directories
echo "1. Creating directory structure..."
mkdir -p admin-frontend/src/pages
mkdir -p admin-frontend/public

# 2. Check if we have the source files
echo "2. Checking for React source files..."
if [ ! -f "admin-frontend/src/App.js" ]; then
    echo "❌ Missing React source files!"
    echo "Please ensure all files from the artifacts are in place:"
    echo "  - admin-frontend/src/App.js"
    echo "  - admin-frontend/src/index.js"
    echo "  - admin-frontend/src/pages/Login.js"
    echo "  - admin-frontend/src/pages/Dashboard.js"
    echo "  - admin-frontend/src/pages/ItemsCategories.js"
    echo "  - admin-frontend/src/pages/Users.js"
    echo "  - admin-frontend/src/pages/BackupRestore.js"
    echo "  - admin-frontend/src/pages/AuditLogs.js"
    echo "  - admin-frontend/public/index.html"
    echo "  - admin-frontend/package.json"
    echo ""
    echo "Would you like me to create a temporary all-in-one version? (y/n)"
    read -r response
    if [[ "$response" == "y" ]]; then
        echo "Creating all-in-one React app..."
        # Create all-in-one App.js with all components
        cat > admin-frontend/src/App.js << 'APPEOF'
// This is a temporary all-in-one file
// Replace with individual component files for production
import React from 'react';

function App() {
  return (
    <div style={{ textAlign: 'center', padding: '2rem' }}>
      <h1>Setting up Full Admin Dashboard...</h1>
      <p>Please add all the component files from the artifacts.</p>
    </div>
  );
}

export default App;
APPEOF
    else
        exit 1
    fi
fi

# 3. Update Dockerfile for React development
echo "3. Updating Dockerfile for React..."
cat > admin-frontend/Dockerfile << 'EOF'
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy all source files
COPY . .

# Expose port 3000 (React dev server)
EXPOSE 3000

# Start React development server
CMD ["npm", "start"]
EOF

# 4. Ensure package.json has all dependencies
echo "4. Checking package.json..."
if [ ! -f "admin-frontend/package.json" ]; then
    echo "Creating package.json..."
    cat > admin-frontend/package.json << 'EOF'
{
  "name": "dietary-admin-frontend",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-scripts": "5.0.1"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  },
  "eslintConfig": {
    "extends": [
      "react-app"
    ]
  },
  "browserslist": {
    "production": [
      ">0.2%",
      "not dead",
      "not op_mini all"
    ],
    "development": [
      "last 1 chrome version",
      "last 1 firefox version",
      "last 1 safari version"
    ]
  },
  "proxy": "http://backend:3000"
}
EOF
fi

# 5. Update docker-compose for React
echo "5. Updating docker-compose.yml..."
cat > docker-compose.yml << 'EOF'
services:
  postgres:
    image: postgres:15-alpine
    container_name: dietary_postgres
    environment:
      POSTGRES_USER: dietary_user
      POSTGRES_PASSWORD: ${DB_PASSWORD:-DietarySecurePass2024!}
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
      DB_PASSWORD: ${DB_PASSWORD:-DietarySecurePass2024!}
      JWT_SECRET: ${JWT_SECRET:-your-super-secret-jwt-key-change-this}
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

# 6. Install dependencies locally first (optional but helps)
echo "6. Installing dependencies..."
cd admin-frontend
npm install 2>/dev/null || echo "Skipping local install"
cd ..

# 7. Rebuild and start
echo "7. Rebuilding frontend with React..."
sudo docker compose stop admin-frontend
sudo docker compose rm -f admin-frontend
sudo docker compose up -d --build admin-frontend

# 8. Wait for React to start
echo "8. Waiting for React dev server to start (this may take 30-60 seconds)..."
sleep 10

# 9. Check logs
echo "9. Checking React startup logs..."
sudo docker compose logs --tail=20 admin-frontend

echo ""
echo "======================================="
echo "React Admin Dashboard Setup Complete!"
echo ""
echo "The full admin panel should be starting at:"
echo "http://192.168.1.74:3001"
echo ""
echo "Note: React development server takes 30-60 seconds to fully start."
echo ""
echo "To view live logs:"
echo "sudo docker compose logs -f admin-frontend"
echo ""
echo "If you see 'Module not found' errors, ensure all component files"
echo "from the artifacts are in the admin-frontend/src directory."
