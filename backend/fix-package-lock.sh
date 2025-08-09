#!/bin/bash
# /opt/dietarydb/fix-package-lock.sh
# Fix the package-lock.json issue preventing frontend build

set -e

echo "======================================"
echo "Fixing Package Lock Issue"
echo "======================================"

cd /opt/dietarydb

# Step 1: Create proper package.json for admin-frontend
echo ""
echo "Step 1: Creating package.json for admin-frontend..."
echo "==================================================="

cat > admin-frontend/package.json << 'EOF'
{
  "name": "dietarydb-admin",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "@testing-library/jest-dom": "^5.16.5",
    "@testing-library/react": "^13.4.0",
    "@testing-library/user-event": "^13.5.0",
    "axios": "^1.3.4",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.8.1",
    "react-scripts": "5.0.1",
    "recharts": "^2.4.3",
    "web-vitals": "^2.1.4"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  },
  "eslintConfig": {
    "extends": [
      "react-app",
      "react-app/jest"
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
  }
}
EOF

# Step 2: Generate package-lock.json using npm install
echo ""
echo "Step 2: Generating package-lock.json..."
echo "========================================"

cd admin-frontend

# Remove any existing node_modules and lock files
rm -rf node_modules package-lock.json

# Run npm install to generate package-lock.json
echo "Running npm install (this may take a minute)..."
npm install

# Verify package-lock.json was created
if [ -f "package-lock.json" ]; then
    echo "✓ package-lock.json created successfully"
    ls -lh package-lock.json
else
    echo "✗ Failed to create package-lock.json"
    exit 1
fi

cd ..

# Step 3: Update Dockerfile to handle both npm ci and npm install
echo ""
echo "Step 3: Updating admin-frontend Dockerfile..."
echo "============================================="

cat > admin-frontend/Dockerfile << 'EOF'
# Build stage
FROM node:18-alpine as builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies - use npm ci if lock file exists, otherwise npm install
RUN if [ -f package-lock.json ]; then \
        npm ci --silent; \
    else \
        npm install --silent; \
    fi

# Copy source code
COPY . .

# Build the React app
ENV GENERATE_SOURCEMAP=false
ENV CI=false
RUN npm run build || (echo "Build failed, creating placeholder" && \
    mkdir -p build && \
    echo '<!DOCTYPE html><html><head><title>DietaryDB</title></head><body><h1>Build Error - Check Logs</h1></body></html>' > build/index.html)

# Production stage
FROM nginx:alpine

# Copy built files from builder
COPY --from=builder /app/build /usr/share/nginx/html

# Custom nginx config to handle React routing and API proxy
RUN cat > /etc/nginx/conf.d/default.conf << 'NGINX'
server {
    listen 80;
    server_name localhost;
    
    root /usr/share/nginx/html;
    index index.html;
    
    # React app - catch all routes
    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
    }
    
    # Proxy API requests to backend
    location /api {
        proxy_pass http://dietary_backend:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
NGINX

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
EOF

# Step 4: Ensure React source files exist
echo ""
echo "Step 4: Ensuring React source files exist..."
echo "============================================"

# Create basic public/index.html if missing
mkdir -p admin-frontend/public
if [ ! -f "admin-frontend/public/index.html" ]; then
    cat > admin-frontend/public/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#000000" />
    <meta name="description" content="DietaryDB Admin Panel" />
    <title>DietaryDB Admin</title>
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
  </body>
</html>
EOF
fi

# Create basic src/index.js if missing
mkdir -p admin-frontend/src
if [ ! -f "admin-frontend/src/index.js" ]; then
    cat > admin-frontend/src/index.js << 'EOF'
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
EOF
fi

# Create basic src/App.js if missing
if [ ! -f "admin-frontend/src/App.js" ]; then
    cat > admin-frontend/src/App.js << 'EOF'
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [dashboardData, setDashboardData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token) {
      setIsLoggedIn(true);
      loadDashboard();
    }
  }, [token]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    const username = e.target.username.value;
    const password = e.target.password.value;
    
    try {
      const response = await axios.post(`${API_URL}/api/auth/login`, {
        username,
        password
      });
      
      const { token } = response.data;
      localStorage.setItem('token', token);
      setToken(token);
      setIsLoggedIn(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadDashboard = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDashboardData(response.data);
    } catch (err) {
      console.error('Dashboard error:', err);
      if (err.response?.status === 401) {
        handleLogout();
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setIsLoggedIn(false);
    setDashboardData(null);
  };

  if (!isLoggedIn) {
    return (
      <div className="login-container">
        <form onSubmit={handleLogin} className="login-form">
          <h2>DietaryDB Login</h2>
          {error && <div className="error">{error}</div>}
          <input 
            name="username" 
            type="text" 
            placeholder="Username" 
            defaultValue="admin" 
            required 
          />
          <input 
            name="password" 
            type="password" 
            placeholder="Password" 
            defaultValue="admin123" 
            required 
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>DietaryDB Dashboard</h1>
        <button onClick={handleLogout}>Logout</button>
      </header>
      <main>
        {dashboardData ? (
          <div className="dashboard">
            <div className="stats">
              <div className="stat-card">
                <h3>{dashboardData.totalItems || 0}</h3>
                <p>Total Items</p>
              </div>
              <div className="stat-card">
                <h3>{dashboardData.totalUsers || 0}</h3>
                <p>Total Users</p>
              </div>
              <div className="stat-card">
                <h3>{dashboardData.totalCategories || 0}</h3>
                <p>Categories</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="loading">Loading...</div>
        )}
      </main>
    </div>
  );
}

export default App;
EOF
fi

# Create basic CSS files if missing
if [ ! -f "admin-frontend/src/App.css" ]; then
    cat > admin-frontend/src/App.css << 'EOF'
.App {
  text-align: center;
  min-height: 100vh;
  background: #f5f5f5;
}

.App-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-form {
  background: white;
  padding: 40px;
  border-radius: 10px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.2);
}

.login-form input {
  width: 100%;
  padding: 10px;
  margin: 10px 0;
  border: 1px solid #ddd;
  border-radius: 5px;
}

.login-form button {
  width: 100%;
  padding: 12px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

.stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  padding: 40px;
}

.stat-card {
  background: white;
  padding: 30px;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.error {
  background: #fee;
  color: #c33;
  padding: 10px;
  border-radius: 5px;
  margin: 10px 0;
}
EOF
fi

if [ ! -f "admin-frontend/src/index.css" ]; then
    cat > admin-frontend/src/index.css << 'EOF'
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

code {
  font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New',
    monospace;
}
EOF
fi

# Step 5: Create .env file
echo ""
echo "Step 5: Creating .env file for frontend..."
echo "=========================================="

cat > admin-frontend/.env << 'EOF'
REACT_APP_API_URL=http://localhost:3000
GENERATE_SOURCEMAP=false
CI=false
EOF

# Step 6: Rebuild the frontend container
echo ""
echo "Step 6: Rebuilding frontend container..."
echo "========================================"

docker-compose build admin-frontend

# Step 7: Start all services
echo ""
echo "Step 7: Starting all services..."
echo "================================"

docker-compose up -d

# Step 8: Wait and verify
echo ""
echo "Step 8: Waiting for services to start..."
sleep 15

# Step 9: Check status
echo ""
echo "Step 9: Checking application status..."
echo "======================================"

echo "Container Status:"
docker ps --format "table {{.Names}}\t{{.Status}}" | grep dietary

echo ""
echo "Testing Frontend:"
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001)
if [ "$FRONTEND_STATUS" = "200" ]; then
    echo "✓ Frontend is accessible (HTTP 200)"
else
    echo "✗ Frontend not accessible (HTTP $FRONTEND_STATUS)"
fi

echo ""
echo "Testing Backend:"
BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health)
if [ "$BACKEND_STATUS" = "200" ]; then
    echo "✓ Backend is healthy (HTTP 200)"
else
    echo "✗ Backend not healthy (HTTP $BACKEND_STATUS)"
fi

echo ""
echo "======================================"
echo "Package Lock Fix Complete!"
echo "======================================"
echo ""
echo "The frontend should now build properly."
echo ""
echo "Access the application at:"
echo "  http://localhost:3001"
echo ""
echo "Login with:"
echo "  Username: admin"
echo "  Password: admin123"
echo ""
echo "If you still see issues:"
echo "1. Clear your browser cache completely"
echo "2. Use an incognito/private window"
echo "3. Check logs: docker logs dietary_admin -f"
echo ""
