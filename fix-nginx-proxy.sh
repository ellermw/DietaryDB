#!/bin/bash
# /opt/dietarydb/fix-nginx-proxy.sh
# Configure frontend to use relative URLs with nginx proxy

set -e

echo "======================================"
echo "Fixing Frontend with Nginx Proxy"
echo "======================================"

cd /opt/dietarydb

# Step 1: Update React app to use relative URLs
echo ""
echo "Step 1: Updating React app to use relative URLs..."
echo "=================================================="

cat > admin-frontend/src/App.js << 'EOF'
import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [data, setData] = useState(null);
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');

  // Use relative URLs - nginx will proxy to backend
  const API_URL = '';  // Empty means use same host

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        localStorage.setItem('token', result.token);
        setToken(result.token);
        setError('');
      } else {
        setError(result.message || 'Login failed');
      }
    } catch (err) {
      setError('Cannot connect to backend. Please try again.');
      console.error('Login error:', err);
    }
  };

  const loadDashboard = async () => {
    if (!token) return;
    
    try {
      const response = await fetch('/api/dashboard', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const result = await response.json();
        setData(result);
      } else if (response.status === 401) {
        localStorage.removeItem('token');
        setToken(null);
      }
    } catch (err) {
      console.error('Dashboard error:', err);
    }
  };

  useEffect(() => {
    if (token) {
      loadDashboard();
    }
  }, [token]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setData(null);
  };

  if (!token) {
    return (
      <div className="login-page">
        <form onSubmit={handleLogin} className="login-form">
          <h2>DietaryDB Login</h2>
          {error && <div className="error">{error}</div>}
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit">Login</button>
        </form>
      </div>
    );
  }

  return (
    <div className="App">
      <header>
        <h1>DietaryDB Dashboard</h1>
        <button onClick={handleLogout}>Logout</button>
      </header>
      <main>
        {data ? (
          <div className="dashboard">
            <div className="stat">
              <h2>{data.totalItems || 0}</h2>
              <p>Items</p>
            </div>
            <div className="stat">
              <h2>{data.totalUsers || 0}</h2>
              <p>Users</p>
            </div>
            <div className="stat">
              <h2>{data.totalCategories || 0}</h2>
              <p>Categories</p>
            </div>
          </div>
        ) : (
          <p>Loading...</p>
        )}
      </main>
    </div>
  );
}

export default App;
EOF

# Step 2: Update Dockerfile with proper nginx proxy configuration
echo ""
echo "Step 2: Updating Dockerfile with nginx proxy..."
echo "=============================================="

cat > admin-frontend/Dockerfile << 'EOF'
# Build stage
FROM node:18-alpine as builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy all source files
COPY . .

# Build the React app
ENV GENERATE_SOURCEMAP=false
ENV CI=false
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built React app
COPY --from=builder /app/build /usr/share/nginx/html

# Create nginx config with proxy to backend
RUN cat > /etc/nginx/conf.d/default.conf << 'NGINX'
server {
    listen 80;
    server_name _;
    
    # Serve React app
    location / {
        root /usr/share/nginx/html;
        index index.html index.htm;
        try_files $uri $uri/ /index.html;
    }
    
    # Proxy API requests to backend container
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
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
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

# Step 3: Ensure docker-compose has correct network setup
echo ""
echo "Step 3: Verifying docker-compose networking..."
echo "============================================="

# Check if networks section exists in docker-compose.yml
if ! grep -q "dietary_net" docker-compose.yml; then
    echo "Network configuration looks incorrect. Updating..."
    cat >> docker-compose.yml << 'EOF'

networks:
  dietary_net:
    driver: bridge
EOF
fi

# Step 4: Rebuild the frontend container
echo ""
echo "Step 4: Rebuilding frontend container..."
echo "========================================"

docker-compose build admin-frontend
docker-compose up -d admin-frontend

# Step 5: Wait for services
echo ""
echo "Step 5: Waiting for services to start..."
echo "========================================"
sleep 10

# Step 6: Test the proxy configuration
echo ""
echo "Step 6: Testing nginx proxy configuration..."
echo "==========================================="

# Test from inside the frontend container
docker exec dietary_admin sh -c "wget -qO- http://dietary_backend:3000/health" && echo "✓ Backend reachable from frontend container" || echo "✗ Backend not reachable"

# Check nginx config
docker exec dietary_admin nginx -t && echo "✓ Nginx config valid" || echo "✗ Nginx config invalid"

# Step 7: Final verification
echo ""
echo "Step 7: Testing complete setup..."
echo "================================="

# Test health endpoint through nginx
curl -s http://localhost:3001/health && echo "✓ Frontend health check working" || echo "✗ Frontend health issue"

# Test API proxy through nginx
curl -s http://localhost:3001/api/test 2>/dev/null | head -20 || echo "API proxy test completed"

echo ""
echo "======================================"
echo "Nginx Proxy Configuration Complete!"
echo "======================================"
echo ""
echo "The frontend now uses relative URLs and nginx proxies to the backend."
echo "This works regardless of the public IP address."
echo ""
echo "To access the application:"
echo "1. Clear your browser cache (Ctrl+Shift+Delete)"
echo "2. Close all browser tabs"
echo "3. Open a new incognito/private window"
echo "4. Go to http://<your-vps-ip>:3001"
echo "5. Login with: admin / admin123"
echo ""
echo "The frontend makes API calls to /api/* which nginx proxies to the backend container."
echo ""
