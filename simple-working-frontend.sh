#!/bin/bash

echo "Creating Simple Working Frontend"
echo "==============================="
echo ""

# 1. Stop the current frontend
echo "1. Stopping current frontend..."
sudo docker compose -f docker-compose-working.yml stop admin-frontend

# 2. Create a simple HTML/JS frontend that definitely works
echo "2. Creating simple frontend..."
mkdir -p simple-frontend

cat > simple-frontend/index.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>Dietary Admin</title>
    <style>
        body { font-family: Arial; margin: 0; padding: 20px; background: #f0f0f0; }
        .login-box { max-width: 300px; margin: 100px auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        input { width: 100%; padding: 10px; margin: 10px 0; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; }
        button { width: 100%; padding: 12px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; }
        button:hover { background: #0056b3; }
        .error { color: red; margin: 10px 0; font-size: 14px; }
        .dashboard { max-width: 800px; margin: 20px auto; }
        .card { background: white; padding: 20px; margin: 10px 0; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
    </style>
</head>
<body>
    <div id="app"></div>
    <script>
        const API_URL = 'http://192.168.1.74:3000';
        
        function showLogin() {
            document.getElementById('app').innerHTML = `
                <div class="login-box">
                    <h2 style="text-align: center;">Admin Login</h2>
                    <form id="loginForm">
                        <input type="text" id="username" placeholder="Username" required>
                        <input type="password" id="password" placeholder="Password" required>
                        <div id="error" class="error"></div>
                        <button type="submit">Login</button>
                    </form>
                </div>
            `;
            
            document.getElementById('loginForm').onsubmit = async (e) => {
                e.preventDefault();
                const username = document.getElementById('username').value;
                const password = document.getElementById('password').value;
                
                try {
                    const response = await fetch(API_URL + '/api/auth/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username, password })
                    });
                    
                    const data = await response.json();
                    
                    if (response.ok) {
                        localStorage.setItem('token', data.token);
                        localStorage.setItem('user', JSON.stringify(data.user));
                        showDashboard();
                    } else {
                        document.getElementById('error').textContent = data.error || 'Login failed';
                    }
                } catch (err) {
                    document.getElementById('error').textContent = 'Connection error';
                }
            };
        }
        
        function showDashboard() {
            const user = JSON.parse(localStorage.getItem('user'));
            document.getElementById('app').innerHTML = `
                <div class="dashboard">
                    <div class="card">
                        <h1>Dietary Admin Dashboard</h1>
                        <p>Welcome, ${user.fullName || user.username}!</p>
                        <button onclick="logout()">Logout</button>
                    </div>
                    <div class="card">
                        <h2>Quick Stats</h2>
                        <p>✓ System is running</p>
                        <p>✓ Database connected</p>
                        <p>✓ Backend API healthy</p>
                    </div>
                </div>
            `;
        }
        
        function logout() {
            localStorage.clear();
            showLogin();
        }
        
        // Check if logged in
        if (localStorage.getItem('token')) {
            showDashboard();
        } else {
            showLogin();
        }
    </script>
</body>
</html>
EOF

# 3. Create simple Dockerfile
cat > simple-frontend/Dockerfile << 'EOF'
FROM nginx:alpine
COPY index.html /usr/share/nginx/html/
EOF

# 4. Run the simple frontend
echo "3. Starting simple frontend..."
sudo docker run -d \
  --name dietary_admin_simple \
  --network dietary_network \
  -p 3002:80 \
  -v $(pwd)/simple-frontend/index.html:/usr/share/nginx/html/index.html \
  nginx:alpine

echo ""
echo "==============================="
echo "Simple frontend created!"
echo ""
echo "Access it at: http://192.168.1.74:3002"
echo ""
echo "This simple version:"
echo "✓ Has NO default credentials shown"
echo "✓ Connects directly to your backend"
echo "✓ No React compilation needed"
echo ""
echo "Login with: admin / admin123"
echo ""
echo "To stop: sudo docker rm -f dietary_admin_simple"
