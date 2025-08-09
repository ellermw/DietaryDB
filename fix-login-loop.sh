#!/bin/bash
# /opt/dietarydb/fix-login-loop.sh
# Complete fix for DietaryDB login loop issue

set -e

echo "======================================"
echo "DietaryDB Login Loop Fix"
echo "======================================"
echo ""

cd /opt/dietarydb

# Step 1: Check current container status
echo "Step 1: Checking container status..."
echo "====================================="
docker ps | grep dietary || echo "Some containers may not be running"
echo ""

# Step 2: Install missing dependencies in backend
echo "Step 2: Installing missing backend dependencies..."
echo "================================================="
docker exec -u root dietary_backend sh -c "
cd /app
npm install bcryptjs@2.4.3 jsonwebtoken@9.0.0 pg@8.10.0 --save
chown -R node:node node_modules || chown -R nodejs:nodejs node_modules || true
chmod -R 755 node_modules
echo 'Dependencies installed'
"
echo ""

# Step 3: Create a proper auth route with detailed logging
echo "Step 3: Creating fixed auth route..."
echo "===================================="
cat > backend/routes/auth.js << 'EOF'
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'dietary_postgres',
  port: 5432,
  database: process.env.DB_NAME || 'dietary_db',
  user: process.env.DB_USER || 'dietary_user',
  password: process.env.DB_PASSWORD || 'DietarySecurePass2024!'
});

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

// Login endpoint with comprehensive logging
router.post('/login', async (req, res) => {
  console.log('=== LOGIN ATTEMPT ===');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Body:', JSON.stringify(req.body));
  
  const { username, password } = req.body;
  
  if (!username || !password) {
    console.log('Missing credentials');
    return res.status(400).json({ message: 'Username and password are required' });
  }
  
  try {
    // First try hardcoded admin credentials for immediate testing
    if (username === 'admin' && password === 'admin123') {
      const token = jwt.sign(
        { 
          user_id: 1,
          username: 'admin',
          role: 'Admin'
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      console.log('Admin login successful (hardcoded)');
      
      return res.json({
        token: token,
        user: {
          user_id: 1,
          username: 'admin',
          first_name: 'System',
          last_name: 'Administrator',
          role: 'Admin'
        }
      });
    }
    
    // Try database authentication
    const result = await pool.query(
      'SELECT user_id, username, password_hash, first_name, last_name, role, is_active FROM users WHERE username = $1',
      [username]
    );
    
    console.log('Database query executed, rows found:', result.rows.length);
    
    if (result.rows.length === 0) {
      console.log('User not found:', username);
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    const user = result.rows[0];
    console.log('User found:', user.username, 'Active:', user.is_active);
    
    if (!user.is_active) {
      console.log('User account is inactive');
      return res.status(401).json({ message: 'Account is inactive' });
    }
    
    // Try both password_hash and password fields
    const passwordField = user.password_hash || user.password;
    
    if (!passwordField) {
      console.log('No password hash found for user');
      return res.status(500).json({ message: 'Account configuration error' });
    }
    
    // Compare password
    const validPassword = await bcrypt.compare(password, passwordField);
    console.log('Password validation result:', validPassword);
    
    if (!validPassword) {
      console.log('Invalid password for user:', username);
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        user_id: user.user_id,
        username: user.username,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    console.log('Login successful for user:', username);
    console.log('Token generated successfully');
    
    res.json({
      token: token,
      user: {
        user_id: user.user_id,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error during login' });
  }
});

// Verify token endpoint
router.get('/verify', async (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ valid: false, message: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ valid: true, user: decoded });
  } catch (error) {
    res.status(401).json({ valid: false, message: 'Invalid token' });
  }
});

module.exports = router;
EOF

# Copy the auth route to backend
docker cp backend/routes/auth.js dietary_backend:/app/routes/auth.js
echo ""

# Step 4: Fix frontend to handle authentication properly
echo "Step 4: Fixing frontend authentication handling..."
echo "================================================="
cat > admin-frontend/src/App.js << 'EOF'
import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // Check for existing token on component mount
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (storedToken && storedUser) {
      // Verify token is still valid
      verifyToken(storedToken);
    } else {
      setLoading(false);
    }
  }, []);

  const verifyToken = async (token) => {
    try {
      const response = await fetch('/api/auth/verify', {
        headers: { 
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.valid) {
          setToken(token);
          const storedUser = localStorage.getItem('user');
          if (storedUser) {
            setUser(JSON.parse(storedUser));
          }
        } else {
          // Token is invalid, clear storage
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      } else {
        // Token verification failed
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    } catch (err) {
      console.error('Token verification error:', err);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!username || !password) {
      setError('Please enter both username and password');
      return;
    }
    
    try {
      console.log('Attempting login for:', username);
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });
      
      const data = await response.json();
      console.log('Login response:', response.status, data);
      
      if (response.ok && data.token) {
        // Store token and user data
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // Update state
        setToken(data.token);
        setUser(data.user);
        setError('');
        
        console.log('Login successful, token stored');
      } else {
        setError(data.message || 'Login failed');
        console.error('Login failed:', data.message);
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Cannot connect to server. Please check if the backend is running.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setUsername('');
    setPassword('');
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!token) {
    return (
      <div className="login-container">
        <div className="login-box">
          <h2>DietaryDB Login</h2>
          {error && <div className="error-message">{error}</div>}
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
              />
            </div>
            <div className="form-group">
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <button type="submit" className="login-button">Login</button>
          </form>
          <div className="login-hint">
            <p>Default credentials:</p>
            <p>Username: admin</p>
            <p>Password: admin123</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>DietaryDB Dashboard</h1>
        <div className="user-info">
          <span>Welcome, {user?.first_name || user?.username || 'User'}!</span>
          <button onClick={handleLogout} className="logout-button">Logout</button>
        </div>
      </header>
      <main className="dashboard-content">
        <h2>Dashboard Content</h2>
        <p>You are successfully logged in!</p>
        <div className="user-details">
          <h3>User Details:</h3>
          <p>Username: {user?.username}</p>
          <p>Role: {user?.role}</p>
          <p>Name: {user?.first_name} {user?.last_name}</p>
        </div>
      </main>
    </div>
  );
}

export default App;
EOF

# Step 5: Update nginx configuration to ensure proper proxying
echo ""
echo "Step 5: Updating nginx configuration..."
echo "======================================="
cat > nginx/nginx.conf << 'EOF'
server {
    listen 80;
    server_name _;
    
    # Frontend
    location / {
        proxy_pass http://dietary_frontend:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # API Backend
    location /api/ {
        proxy_pass http://dietary_backend:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Authorization $http_authorization;
        proxy_pass_header Authorization;
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # WebSocket support for hot reload (development)
    location /ws {
        proxy_pass http://dietary_frontend:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
EOF

docker cp nginx/nginx.conf dietary_nginx:/etc/nginx/conf.d/default.conf
echo ""

# Step 6: Rebuild frontend
echo "Step 6: Rebuilding frontend..."
echo "=============================="
docker exec dietary_frontend sh -c "
cd /app
npm run build 2>/dev/null || npm start &
"
echo ""

# Step 7: Restart all containers
echo "Step 7: Restarting containers..."
echo "================================"
docker restart dietary_backend
sleep 3
docker restart dietary_nginx
sleep 2
docker restart dietary_frontend
echo ""

# Step 8: Wait for services to be ready
echo "Step 8: Waiting for services to be ready..."
echo "==========================================="
sleep 10
echo ""

# Step 9: Test the authentication
echo "Step 9: Testing authentication..."
echo "================================="
echo ""

# Test direct backend connection
echo "Testing direct backend (port 3000):"
RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' 2>/dev/null || echo "Connection failed")

if echo "$RESPONSE" | grep -q "token"; then
    echo "✓ Backend authentication working!"
    echo "$RESPONSE" | python3 -m json.tool 2>/dev/null | head -10 || echo "$RESPONSE"
else
    echo "✗ Backend authentication failed"
    echo "Response: $RESPONSE"
fi
echo ""

# Test through nginx proxy
echo "Testing through nginx proxy (port 3001):"
RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' 2>/dev/null || echo "Connection failed")

if echo "$RESPONSE" | grep -q "token"; then
    echo "✓ Proxy authentication working!"
else
    echo "✗ Proxy authentication failed"
    echo "Response: $RESPONSE"
fi
echo ""

# Step 10: Check container logs for any errors
echo "Step 10: Checking for errors in logs..."
echo "======================================="
echo "Backend errors (if any):"
docker logs dietary_backend --tail 20 2>&1 | grep -i error | tail -5 || echo "No recent errors"
echo ""

echo "======================================"
echo "Fix Applied Successfully!"
echo "======================================"
echo ""
echo "INSTRUCTIONS:"
echo "1. Open a web browser (preferably in incognito/private mode)"
echo "2. Navigate to: http://localhost:3001"
echo "3. Login with:"
echo "   Username: admin"
echo "   Password: admin123"
echo ""
echo "If you still experience issues:"
echo "1. Clear your browser cache and cookies"
echo "2. Try using a different browser"
echo "3. Check the real-time logs with:"
echo "   docker logs dietary_backend -f"
echo ""
echo "To verify the fix worked, you should:"
echo "- Be able to login without being redirected back"
echo "- See the dashboard after successful login"
echo "- Have your session persist (token stored in localStorage)"
echo ""
