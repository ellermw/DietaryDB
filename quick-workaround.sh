#!/bin/bash

echo "Applying quick workaround for ContainerConfig error..."
echo "===================================================="
echo ""

# 1. Stop everything cleanly
echo "1. Cleaning up..."
sudo docker-compose down --remove-orphans
sudo docker rm -f dietary_admin dietary_admin_new 2>/dev/null || true

# 2. Create minimal frontend that works
echo "2. Creating minimal frontend..."
mkdir -p admin-frontend

cat > admin-frontend/index.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>Dietary Admin Dashboard</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background: #f0f2f5; }
        .header { background: #1e293b; color: white; padding: 1rem 2rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header h1 { font-size: 1.5rem; font-weight: 600; }
        .container { max-width: 1200px; margin: 2rem auto; padding: 0 1rem; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; margin-bottom: 2rem; }
        .card { background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .card h2 { font-size: 1.25rem; margin-bottom: 1rem; color: #1e293b; }
        .status-ok { color: #10b981; font-weight: 600; }
        .status-error { color: #ef4444; font-weight: 600; }
        .button { display: inline-block; padding: 0.75rem 1.5rem; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px; font-weight: 500; transition: background 0.2s; }
        .button:hover { background: #2563eb; }
        .info-grid { display: grid; grid-template-columns: auto 1fr; gap: 0.5rem 1rem; }
        .info-label { font-weight: 600; color: #64748b; }
        code { background: #f1f5f9; padding: 0.25rem 0.5rem; border-radius: 4px; font-family: monospace; font-size: 0.875rem; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🍽️ Dietary Management System - Admin Dashboard</h1>
    </div>
    
    <div class="container">
        <div class="grid">
            <div class="card">
                <h2>✅ System Status</h2>
                <p class="status-ok">Frontend is running!</p>
                <p style="margin-top: 0.5rem; color: #64748b;">The admin interface is operational.</p>
            </div>
            
            <div class="card">
                <h2>🔌 Connection Info</h2>
                <div class="info-grid">
                    <span class="info-label">Frontend:</span>
                    <span>http://192.168.1.74:3001</span>
                    <span class="info-label">Backend API:</span>
                    <span>http://192.168.1.74:3000</span>
                    <span class="info-label">Database:</span>
                    <span>PostgreSQL on port 5432</span>
                </div>
            </div>
            
            <div class="card">
                <h2>🔐 Default Credentials</h2>
                <div class="info-grid">
                    <span class="info-label">Username:</span>
                    <span><code>admin</code></span>
                    <span class="info-label">Password:</span>
                    <span><code>admin123</code></span>
                </div>
                <p style="margin-top: 1rem; font-size: 0.875rem; color: #ef4444;">
                    ⚠️ Change these immediately after first login!
                </p>
            </div>
        </div>
        
        <div class="card">
            <h2>🚀 Quick Start Guide</h2>
            <ol style="margin-left: 1.5rem; line-height: 1.8;">
                <li>Verify all services are running: <code>sudo docker-compose ps</code></li>
                <li>Check backend health: <code>curl http://localhost:3000/api/health</code></li>
                <li>View logs if needed: <code>sudo docker-compose logs -f [service_name]</code></li>
                <li>Access the full admin panel once React components are loaded</li>
            </ol>
        </div>
        
        <div class="card">
            <h2>🛠️ Troubleshooting</h2>
            <p style="margin-bottom: 1rem;">If you're seeing this page but need the full admin interface:</p>
            <ol style="margin-left: 1.5rem; line-height: 1.8;">
                <li>Ensure all React components from the artifacts are in place</li>
                <li>Run: <code>cd admin-frontend && npm install && cd ..</code></li>
                <li>Rebuild: <code>sudo docker-compose up -d --build admin-frontend</code></li>
            </ol>
        </div>
        
        <div style="text-align: center; margin-top: 3rem; padding: 2rem; color: #64748b;">
            <p>Dietary Management System v1.0</p>
            <p style="margin-top: 0.5rem; font-size: 0.875rem;">
                <a href="#" class="button" style="margin-top: 1rem;">Check Backend API</a>
            </p>
        </div>
    </div>
    
    <script>
        // Check backend connectivity
        fetch('http://' + window.location.hostname + ':3000/api/health')
            .then(r => r.json())
            .then(data => {
                console.log('Backend health:', data);
            })
            .catch(err => {
                console.error('Backend connection error:', err);
            });
    </script>
</body>
</html>
EOF

# 3. Create a super simple Dockerfile
cat > admin-frontend/Dockerfile << 'EOF'
FROM nginx:alpine
COPY index.html /usr/share/nginx/html/
EXPOSE 80
EOF

# 4. Update docker-compose to use port 80 internally
cat > docker-compose-simple.yml << 'EOF'
version: '3.8'

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

  backend:
    build: ./backend
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
    ports:
      - "3000:3000"
    depends_on:
      postgres:
        condition: service_healthy

  admin-frontend:
    build: ./admin-frontend
    container_name: dietary_admin_nginx
    ports:
      - "3001:80"
    depends_on:
      - backend

volumes:
  postgres_data:

networks:
  default:
    name: dietary_network
EOF

# 5. Build and run
echo "3. Starting services..."
sudo docker-compose -f docker-compose-simple.yml up -d --build

echo ""
echo "===================================================="
echo "Workaround applied!"
echo ""
echo "The admin panel should now be accessible at:"
echo "http://192.168.1.74:3001"
echo ""
echo "This is a minimal working version. To get the full"
echo "React admin panel, ensure all component files are"
echo "in place and rebuild."
echo ""
