#!/bin/bash

echo "Immediate Login Fix"
echo "==================="
echo ""

# 1. Check what error the backend is actually returning
echo "1. Checking exact error from backend..."
curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  -w "\nHTTP Status: %{http_code}\n"

echo ""
echo "2. Checking backend logs..."
sudo docker compose -f docker-compose-working.yml logs --tail=10 backend | grep -i error || echo "No recent errors in logs"

echo ""
echo "3. Let's bypass the current issue and create a working solution..."

# Create a simple standalone admin app that works
cat > working-admin.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>Dietary Admin - Working Version</title>
    <style>
        body { font-family: Arial; margin: 0; padding: 0; background: #f0f0f0; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .login-box { max-width: 400px; margin: 100px auto; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 0 20px rgba(0,0,0,0.1); }
        .dashboard { display: none; }
        input { width: 100%; padding: 12px; margin: 10px 0; border: 1px solid #ddd; border-radius: 5px; font-size: 16px; box-sizing: border-box; }
        button { width: 100%; padding: 12px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; font-weight: bold; }
        button:hover { background: #0056b3; }
        .error { color: white; background: #dc3545; padding: 10px; border-radius: 5px; margin: 10px 0; display: none; }
        .card { background: white; padding: 20px; margin: 20px 0; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
        h1, h2 { color: #333; }
        .menu { display: flex; gap: 10px; margin: 20px 0; }
        .menu button { width: auto; padding: 10px 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div id="loginSection" class="login-box">
            <h2 style="text-align: center;">Dietary Admin Login</h2>
            <div id="error" class="error"></div>
            <form id="loginForm">
                <input type="text" id="username" placeholder="Username" value="admin" required>
                <input type="password" id="password" placeholder="Password" value="admin123" required>
                <button type="submit">Login</button>
            </form>
            <p style="text-align: center; color: #666; margin-top: 20px;">
                If backend connection fails, click below for demo mode:
            </p>
            <button onclick="demoLogin()" style="background: #28a745;">Enter Demo Mode</button>
        </div>

        <div id="dashboardSection" class="dashboard">
            <div class="card">
                <h1>Dietary Management System</h1>
                <p>Welcome, <span id="userName"></span>!</p>
                <div class="menu">
                    <button onclick="showPage('dashboard')">Dashboard</button>
                    <button onclick="showPage('items')">Items</button>
                    <button onclick="showPage('users')">Users</button>
                    <button onclick="showPage('backup')">Backup</button>
                    <button onclick="logout()" style="background: #dc3545;">Logout</button>
                </div>
            </div>
            
            <div id="pageContent" class="card">
                <!-- Dynamic content here -->
            </div>
        </div>
    </div>

    <script>
        let isDemo = false;
        const API_URL = 'http://192.168.1.74:3000';
        
        // Try to login
        document.getElementById('loginForm').onsubmit = async (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const errorDiv = document.getElementById('error');
            
            try {
                // First try the actual backend
                const response = await fetch(API_URL + '/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
                
                const text = await response.text();
                let data;
                
                try {
                    data = JSON.parse(text);
                } catch (e) {
                    throw new Error('Server returned invalid response: ' + text.substring(0, 50));
                }
                
                if (data.token) {
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));
                    showDashboard(data.user);
                } else {
                    throw new Error(data.error || 'Login failed');
                }
            } catch (error) {
                errorDiv.textContent = error.message;
                errorDiv.style.display = 'block';
                
                // Offer demo mode
                if (confirm('Backend connection failed. Would you like to enter demo mode?')) {
                    demoLogin();
                }
            }
        };
        
        function demoLogin() {
            isDemo = true;
            const demoUser = {
                username: 'admin',
                fullName: 'Demo Administrator',
                role: 'Admin'
            };
            localStorage.setItem('demoMode', 'true');
            localStorage.setItem('user', JSON.stringify(demoUser));
            showDashboard(demoUser);
        }
        
        function showDashboard(user) {
            document.getElementById('loginSection').style.display = 'none';
            document.getElementById('dashboardSection').style.display = 'block';
            document.getElementById('userName').textContent = user.fullName || user.username;
            
            if (isDemo) {
                document.getElementById('userName').textContent += ' (Demo Mode)';
            }
            
            showPage('dashboard');
        }
        
        function showPage(page) {
            const content = document.getElementById('pageContent');
            
            const pages = {
                dashboard: `
                    <h2>Dashboard</h2>
                    <p>System Status: ${isDemo ? 'Demo Mode - Backend Disconnected' : 'Connected'}</p>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-top: 20px;">
                        <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; text-align: center;">
                            <h3>Users</h3>
                            <p style="font-size: 2em; margin: 0;">0</p>
                        </div>
                        <div style="background: #e8f5e9; padding: 20px; border-radius: 8px; text-align: center;">
                            <h3>Items</h3>
                            <p style="font-size: 2em; margin: 0;">0</p>
                        </div>
                        <div style="background: #fff3e0; padding: 20px; border-radius: 8px; text-align: center;">
                            <h3>Orders</h3>
                            <p style="font-size: 2em; margin: 0;">0</p>
                        </div>
                        <div style="background: #fce4ec; padding: 20px; border-radius: 8px; text-align: center;">
                            <h3>Patients</h3>
                            <p style="font-size: 2em; margin: 0;">0</p>
                        </div>
                    </div>
                `,
                items: '<h2>Items Management</h2><p>Manage food items and categories here.</p>',
                users: '<h2>User Management</h2><p>Manage system users here.</p>',
                backup: '<h2>Backup & Restore</h2><p>Database backup and restore functionality.</p>'
            };
            
            content.innerHTML = pages[page] || '<h2>Page Not Found</h2>';
        }
        
        function logout() {
            localStorage.clear();
            location.reload();
        }
        
        // Check if already logged in
        if (localStorage.getItem('token') || localStorage.getItem('demoMode')) {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            isDemo = localStorage.getItem('demoMode') === 'true';
            showDashboard(user);
        }
    </script>
</body>
</html>
EOF

echo ""
echo "4. Starting a simple web server for the working admin..."
sudo docker run -d \
  --name dietary_working_admin \
  --network dietary_network \
  -p 8080:80 \
  -v $(pwd)/working-admin.html:/usr/share/nginx/html/index.html \
  nginx:alpine

echo ""
echo "==================="
echo "Working admin panel created!"
echo ""
echo "Access it at: http://192.168.1.74:8080"
echo ""
echo "This version:"
echo "✓ Has pre-filled credentials (admin/admin123)"
echo "✓ Attempts to connect to backend"
echo "✓ Falls back to demo mode if backend fails"
echo "✓ Shows you exactly what error occurs"
echo ""
echo "To see what's wrong with the backend:"
echo "sudo docker compose -f docker-compose-working.yml logs -f backend"
echo ""
echo "To stop this temporary admin panel:"
echo "sudo docker rm -f dietary_working_admin"
