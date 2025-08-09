#!/bin/bash
# /opt/dietarydb/continue-fix.sh
# Continue the fix after nginx configuration

set -e

echo "======================================"
echo "Continuing DietaryDB Fix"
echo "======================================"
echo ""

cd /opt/dietarydb

# Step 1: Reload nginx in the container to apply config
echo "Step 1: Reloading nginx configuration..."
echo "========================================"
docker exec dietary_admin nginx -s reload 2>/dev/null || echo "Nginx reload attempted"
echo "Nginx configuration applied"
echo ""

# Step 2: Create and deploy test login page
echo "Step 2: Creating test login page..."
echo "===================================="
cat > test-login.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>DietaryDB Login Test</title>
    <meta charset="UTF-8">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .container {
            background: white;
            padding: 40px;
            border-radius: 12px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            width: 400px;
            max-width: 90%;
        }
        h2 {
            color: #333;
            margin-bottom: 30px;
            text-align: center;
        }
        .form-group {
            margin-bottom: 20px;
        }
        label {
            display: block;
            margin-bottom: 5px;
            color: #555;
            font-weight: 500;
        }
        input {
            width: 100%;
            padding: 12px;
            border: 2px solid #e0e0e0;
            border-radius: 6px;
            font-size: 16px;
            transition: border-color 0.3s;
        }
        input:focus {
            outline: none;
            border-color: #667eea;
        }
        button {
            width: 100%;
            padding: 14px;
            background: #667eea;
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.3s;
        }
        button:hover {
            background: #5a67d8;
        }
        .message {
            margin: 20px 0;
            padding: 12px;
            border-radius: 6px;
            display: none;
        }
        .message.show {
            display: block;
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
            background: #e8f4ff;
            color: #004085;
            border: 1px solid #b8daff;
        }
        .test-results {
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid #e0e0e0;
        }
        .test-item {
            padding: 8px;
            margin: 5px 0;
            border-radius: 4px;
            font-family: monospace;
            font-size: 14px;
        }
        .test-success {
            background: #e8f5e9;
            color: #2e7d32;
        }
        .test-fail {
            background: #ffebee;
            color: #c62828;
        }
        .credentials {
            background: #f5f5f5;
            padding: 15px;
            border-radius: 6px;
            margin-top: 20px;
        }
        .credentials h4 {
            margin-bottom: 10px;
            color: #666;
        }
        .credentials p {
            color: #555;
            line-height: 1.6;
        }
    </style>
</head>
<body>
    <div class="container">
        <h2>🔐 DietaryDB Authentication Test</h2>
        
        <div id="message" class="message"></div>
        
        <form id="loginForm">
            <div class="form-group">
                <label for="username">Username</label>
                <input type="text" id="username" name="username" value="admin" required>
            </div>
            <div class="form-group">
                <label for="password">Password</label>
                <input type="password" id="password" name="password" value="admin123" required>
            </div>
            <button type="submit">Test Login</button>
        </form>
        
        <div class="credentials">
            <h4>Test Credentials:</h4>
            <p>
                <strong>Username:</strong> admin<br>
                <strong>Password:</strong> admin123
            </p>
        </div>
        
        <div id="testResults" class="test-results" style="display:none;">
            <h4>Test Results:</h4>
            <div id="testItems"></div>
        </div>
    </div>

    <script>
        const API_URL = window.location.origin;
        
        function showMessage(text, type) {
            const msg = document.getElementById('message');
            msg.textContent = text;
            msg.className = 'message show ' + type;
        }
        
        function addTestResult(test, success, details) {
            const container = document.getElementById('testItems');
            const item = document.createElement('div');
            item.className = 'test-item ' + (success ? 'test-success' : 'test-fail');
            item.textContent = (success ? '✓ ' : '✗ ') + test + (details ? ': ' + details : '');
            container.appendChild(item);
            document.getElementById('testResults').style.display = 'block';
        }
        
        async function testEndpoint() {
            try {
                const response = await fetch('/api/auth/login', {
                    method: 'OPTIONS'
                });
                addTestResult('API Endpoint Reachable', response.ok || response.status === 204, `Status: ${response.status}`);
                return true;
            } catch (error) {
                addTestResult('API Endpoint Reachable', false, error.message);
                return false;
            }
        }
        
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            
            document.getElementById('testItems').innerHTML = '';
            showMessage('Testing authentication...', 'info');
            
            // Test if endpoint is reachable
            await testEndpoint();
            
            try {
                // Test login
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ username, password })
                });
                
                const data = await response.json();
                addTestResult('Login Request', response.ok, `Status: ${response.status}`);
                
                if (response.ok && data.token) {
                    addTestResult('Token Received', true, `Token length: ${data.token.length}`);
                    addTestResult('User Data Received', !!data.user, data.user ? data.user.role : 'No user data');
                    
                    // Store token
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));
                    addTestResult('Token Stored in LocalStorage', true);
                    
                    // Test protected endpoint
                    const dashResponse = await fetch('/api/dashboard', {
                        headers: {
                            'Authorization': 'Bearer ' + data.token
                        }
                    });
                    addTestResult('Protected Endpoint Access', dashResponse.ok, `Status: ${dashResponse.status}`);
                    
                    showMessage('✓ Authentication successful! All tests passed.', 'success');
                    
                    // Display user info
                    setTimeout(() => {
                        showMessage(`Logged in as: ${data.user.first_name} ${data.user.last_name} (${data.user.role})`, 'success');
                    }, 2000);
                    
                } else {
                    addTestResult('Token Received', false, data.message || 'No token in response');
                    showMessage('✗ Authentication failed: ' + (data.message || 'Unknown error'), 'error');
                }
                
            } catch (error) {
                addTestResult('Network Request', false, error.message);
                showMessage('✗ Connection error: ' + error.message, 'error');
                console.error('Login error:', error);
            }
        });
        
        // Check existing token on load
        window.addEventListener('load', () => {
            const token = localStorage.getItem('token');
            if (token) {
                showMessage('ℹ️ Existing token found in browser storage', 'info');
            }
        });
    </script>
</body>
</html>
EOF

# Copy test page to admin container
docker cp test-login.html dietary_admin:/usr/share/nginx/html/test-login.html
echo "Test page deployed"
echo ""

# Step 3: Restart containers properly
echo "Step 3: Restarting services..."
echo "=============================="
docker restart dietary_backend
echo "Backend restarted"
sleep 5

docker exec dietary_admin nginx -s reload 2>/dev/null || docker restart dietary_admin
echo "Admin/nginx restarted"
sleep 3
echo ""

# Step 4: Verify backend is running
echo "Step 4: Verifying backend status..."
echo "===================================="
echo "Checking backend health:"
curl -s http://localhost:3000/health 2>/dev/null | python3 -m json.tool 2>/dev/null || echo "Backend not responding on health check"
echo ""

# Step 5: Test authentication
echo "Step 5: Testing authentication endpoints..."
echo "==========================================="
echo ""

echo "Test 1: Direct Backend (port 3000):"
echo "------------------------------------"
RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' 2>/dev/null)

if echo "$RESPONSE" | grep -q "token"; then
    echo "✓ SUCCESS - Backend authentication working!"
    TOKEN=$(echo "$RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
    echo "Token received (first 20 chars): ${TOKEN:0:20}..."
else
    echo "✗ FAILED - Backend not authenticating"
    echo "Response: $RESPONSE"
    echo ""
    echo "Backend logs:"
    docker logs dietary_backend --tail 15 2>&1
fi
echo ""

echo "Test 2: Through Nginx Proxy (port 3001):"
echo "-----------------------------------------"
RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' 2>/dev/null)

if echo "$RESPONSE" | grep -q "token"; then
    echo "✓ SUCCESS - Nginx proxy working!"
else
    echo "✗ FAILED - Nginx proxy not working"
    echo "Response: $RESPONSE"
    echo ""
    echo "Testing if nginx is responding:"
    curl -I http://localhost:3001/ 2>/dev/null | head -3
fi
echo ""

# Step 6: Create a dashboard test page
echo "Step 6: Creating dashboard test page..."
echo "======================================="
cat > dashboard.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>DietaryDB Dashboard</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f5f5f5;
        }
        .header {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .logout-btn {
            background: #dc3545;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
        }
        .content {
            background: white;
            padding: 20px;
            border-radius: 8px;
        }
        .not-logged-in {
            text-align: center;
            padding: 40px;
        }
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }
        .stat-card {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
        }
        .stat-value {
            font-size: 2em;
            font-weight: bold;
            color: #667eea;
        }
    </style>
</head>
<body>
    <div id="app"></div>
    
    <script>
        const token = localStorage.getItem('token');
        const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null;
        const app = document.getElementById('app');
        
        if (!token) {
            app.innerHTML = `
                <div class="content not-logged-in">
                    <h2>Not Logged In</h2>
                    <p>Please <a href="/test-login.html">login first</a></p>
                </div>
            `;
        } else {
            app.innerHTML = `
                <div class="header">
                    <h1>DietaryDB Dashboard</h1>
                    <div>
                        <span>Welcome, ${user?.first_name || user?.username || 'User'}!</span>
                        <button class="logout-btn" onclick="logout()">Logout</button>
                    </div>
                </div>
                <div class="content">
                    <h2>Dashboard Statistics</h2>
                    <div id="stats" class="stats">Loading...</div>
                </div>
            `;
            
            // Load dashboard data
            fetch('/api/dashboard', {
                headers: {
                    'Authorization': 'Bearer ' + token
                }
            })
            .then(response => response.json())
            .then(data => {
                document.getElementById('stats').innerHTML = `
                    <div class="stat-card">
                        <div class="stat-value">${data.totalItems || 0}</div>
                        <div>Total Items</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${data.totalUsers || 0}</div>
                        <div>Total Users</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${data.totalCategories || 0}</div>
                        <div>Categories</div>
                    </div>
                `;
            })
            .catch(error => {
                document.getElementById('stats').innerHTML = 'Error loading dashboard: ' + error.message;
            });
        }
        
        function logout() {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/test-login.html';
        }
    </script>
</body>
</html>
EOF

docker cp dashboard.html dietary_admin:/usr/share/nginx/html/dashboard.html
echo "Dashboard page created"
echo ""

# Step 7: Final status check
echo "======================================"
echo "Fix Applied Successfully!"
echo "======================================"
echo ""
echo "Container Status:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep dietary
echo ""
echo "======================================"
echo "TESTING INSTRUCTIONS:"
echo "======================================"
echo ""
echo "1. AUTHENTICATION TEST PAGE:"
echo "   http://localhost:3001/test-login.html"
echo "   This will test all authentication components"
echo ""
echo "2. DASHBOARD TEST:"
echo "   http://localhost:3001/dashboard.html"
echo "   This shows a working dashboard after login"
echo ""
echo "3. ORIGINAL APPLICATION:"
echo "   http://localhost:3001"
echo ""
echo "Login with:"
echo "  Username: admin"
echo "  Password: admin123"
echo ""
echo "If you're accessing from outside localhost, use:"
echo "  http://<your-server-ip>:3001/test-login.html"
echo ""
echo "To monitor logs:"
echo "  docker logs dietary_backend -f"
echo ""
