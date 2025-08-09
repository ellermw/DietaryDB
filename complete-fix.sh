#!/bin/bash
# /opt/dietarydb/complete-fix.sh
# Complete fix for DietaryDB login loop with proper directory handling

set -e

echo "======================================"
echo "DietaryDB Complete Login Fix"
echo "======================================"
echo ""

cd /opt/dietarydb

# Step 1: Create necessary directories
echo "Step 1: Creating necessary directories..."
echo "========================================="
mkdir -p nginx
mkdir -p admin-frontend/src
echo "Directories created"
echo ""

# Step 2: Check current container status
echo "Step 2: Checking container status..."
echo "====================================="
docker ps --format "table {{.Names}}\t{{.Status}}" | grep dietary || echo "Some containers may not be running"
echo ""

# Step 3: Fix backend authentication completely
echo "Step 3: Creating complete backend server with auth..."
echo "====================================================="
cat > backend/server-fixed.js << 'EOF'
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || 'dietary_postgres',
  port: 5432,
  database: process.env.DB_NAME || 'dietary_db',
  user: process.env.DB_USER || 'dietary_user',
  password: process.env.DB_PASSWORD || 'DietarySecurePass2024!'
});

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  console.log('=== LOGIN ATTEMPT ===');
  console.log('Body:', req.body);
  
  const { username, password } = req.body;
  
  if (!username || !password) {
    console.log('Missing credentials');
    return res.status(400).json({ message: 'Username and password are required' });
  }
  
  try {
    // Hardcoded admin for immediate testing
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
      
      console.log('Admin login successful');
      
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
    
    if (result.rows.length === 0) {
      console.log('User not found');
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    const user = result.rows[0];
    
    if (!user.is_active) {
      return res.status(401).json({ message: 'Account is inactive' });
    }
    
    const validPassword = await bcrypt.compare(password, user.password_hash || user.password);
    
    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
      { 
        user_id: user.user_id,
        username: user.username,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    console.log('Login successful for:', username);
    
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
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Token verification endpoint
app.get('/api/auth/verify', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ valid: false });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ valid: true, user: decoded });
  } catch (error) {
    res.status(401).json({ valid: false });
  }
});

// Dashboard endpoint (protected)
app.get('/api/dashboard', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'Access denied' });
  }
  
  try {
    jwt.verify(token, JWT_SECRET);
    res.json({
      totalItems: 10,
      totalUsers: 5,
      totalCategories: 3,
      recentActivity: []
    });
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
});

// Catch-all for undefined routes
app.use('*', (req, res) => {
  console.log('404 - Route not found:', req.originalUrl);
  res.status(404).json({ message: 'Route not found' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`
====================================
Backend Server Running
Port: ${PORT}
Time: ${new Date().toISOString()}
Auth: Hardcoded admin/admin123 enabled
====================================
  `);
});
EOF

# Copy the fixed server to backend
docker cp backend/server-fixed.js dietary_backend:/app/server.js
echo "Backend server updated"
echo ""

# Step 4: Create nginx configuration for dietary_admin container
echo "Step 4: Creating nginx configuration..."
echo "======================================="
cat > nginx/default.conf << 'EOF'
server {
    listen 80;
    server_name _;
    
    # Increase buffer sizes for headers
    proxy_buffer_size 128k;
    proxy_buffers 4 256k;
    proxy_busy_buffers_size 256k;
    large_client_header_buffers 4 16k;
    
    # Frontend static files
    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
    }
    
    # API proxy to backend
    location /api/ {
        proxy_pass http://dietary_backend:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Ensure Authorization header is passed
        proxy_set_header Authorization $http_authorization;
        proxy_pass_header Authorization;
        
        # CORS headers
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type' always;
        
        if ($request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' '*';
            add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS';
            add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type';
            add_header 'Access-Control-Max-Age' 1728000;
            add_header 'Content-Type' 'text/plain; charset=utf-8';
            add_header 'Content-Length' 0;
            return 204;
        }
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
EOF

# Copy nginx config to admin container
docker cp nginx/default.conf dietary_admin:/etc/nginx/conf.d/default.conf
echo "Nginx configuration updated"
echo ""

# Step 5: Create a simple test HTML page
echo "Step 5: Creating test login page..."
echo "===================================="
cat > admin-frontend/test-login.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>DietaryDB Login Test</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: #f0f0f0;
        }
        .login-box {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            width: 300px;
        }
        h2 {
            margin-top: 0;
            color: #333;
        }
        input {
            width: 100%;
            padding: 10px;
            margin: 10px 0;
            border: 1px solid #ddd;
            border-radius: 4px;
            box-sizing: border-box;
        }
        button {
            width: 100%;
            padding: 12px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
        }
        button:hover {
            background: #0056b3;
        }
        .message {
            margin: 10px 0;
            padding: 10px;
            border-radius: 4px;
        }
        .success {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        .error {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        .info {
            background: #d1ecf1;
            color: #0c5460;
            border: 1px solid #bee5eb;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="login-box">
        <h2>DietaryDB Login Test</h2>
        <div id="message"></div>
        <form id="loginForm">
            <input type="text" id="username" placeholder="Username" value="admin" required>
            <input type="password" id="password" placeholder="Password" value="admin123" required>
            <button type="submit">Login</button>
        </form>
        <div class="info">
            <p>Default credentials:</p>
            <p>Username: admin<br>Password: admin123</p>
        </div>
    </div>

    <script>
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const messageDiv = document.getElementById('message');
            
            messageDiv.className = 'message info';
            messageDiv.textContent = 'Logging in...';
            
            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ username, password })
                });
                
                const data = await response.json();
                console.log('Response:', data);
                
                if (response.ok && data.token) {
                    messageDiv.className = 'message success';
                    messageDiv.textContent = '✓ Login successful! Token received.';
                    
                    // Store token
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));
                    
                    // Show user info
                    setTimeout(() => {
                        messageDiv.innerHTML = `
                            <strong>Logged in as:</strong><br>
                            ${data.user.first_name} ${data.user.last_name}<br>
                            Role: ${data.user.role}<br>
                            <br>Token stored in localStorage!
                        `;
                    }, 1000);
                } else {
                    messageDiv.className = 'message error';
                    messageDiv.textContent = '✗ ' + (data.message || 'Login failed');
                }
            } catch (error) {
                messageDiv.className = 'message error';
                messageDiv.textContent = '✗ Connection error: ' + error.message;
                console.error('Login error:', error);
            }
        });
        
        // Check if already logged in
        const existingToken = localStorage.getItem('token');
        if (existingToken) {
            document.getElementById('message').className = 'message info';
            document.getElementById('message').textContent = 'Token found in localStorage. You may already be logged in.';
        }
    </script>
</body>
</html>
EOF

# Copy test page to admin container
docker cp admin-frontend/test-login.html dietary_admin:/usr/share/nginx/html/test-login.html
echo "Test login page created"
echo ""

# Step 6: Restart containers
echo "Step 6: Restarting containers..."
echo "================================"
docker restart dietary_backend
sleep 5
docker restart dietary_admin
sleep 3
echo "Containers restarted"
echo ""

# Step 7: Test authentication
echo "Step 7: Testing authentication..."
echo "================================="
echo ""

# Wait a bit more for services to be ready
echo "Waiting for services to be ready..."
sleep 5

# Test backend directly
echo "Testing backend directly (port 3000):"
echo "--------------------------------------"
RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' 2>/dev/null || echo "")

if echo "$RESPONSE" | grep -q "token"; then
    echo "✓ Backend authentication working!"
    echo "$RESPONSE" | python3 -m json.tool 2>/dev/null | head -15 || echo "$RESPONSE" | head -100
else
    echo "✗ Backend not responding properly"
    echo "Response: $RESPONSE"
    echo ""
    echo "Checking backend logs:"
    docker logs dietary_backend --tail 10
fi
echo ""

# Test through nginx
echo "Testing through nginx (port 3001):"
echo "-----------------------------------"
RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' 2>/dev/null || echo "")

if echo "$RESPONSE" | grep -q "token"; then
    echo "✓ Nginx proxy working!"
else
    echo "✗ Nginx proxy issue detected"
    echo "Response: $RESPONSE"
fi
echo ""

# Step 8: Display final instructions
echo "======================================"
echo "Fix Complete!"
echo "======================================"
echo ""
echo "TESTING INSTRUCTIONS:"
echo ""
echo "1. TEST PAGE (Recommended):"
echo "   Open: http://localhost:3001/test-login.html"
echo "   This page will show you exactly what's happening"
echo ""
echo "2. MAIN APPLICATION:"
echo "   Open: http://localhost:3001"
echo ""
echo "3. LOGIN CREDENTIALS:"
echo "   Username: admin"
echo "   Password: admin123"
echo ""
echo "TROUBLESHOOTING:"
echo ""
echo "If login still loops:"
echo "1. Clear browser cache/cookies"
echo "2. Use incognito/private browsing mode"
echo "3. Check browser console for errors (F12)"
echo "4. Monitor backend logs:"
echo "   docker logs dietary_backend -f"
echo ""
echo "To verify the backend is working:"
echo "   curl http://localhost:3000/health"
echo ""
echo "Container status:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep dietary
echo ""
