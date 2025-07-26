#!/bin/bash

echo "Clean Backend Setup"
echo "==================="
echo ""

# 1. Clean up any existing backends
echo "1. Cleaning up..."
sudo docker stop dietary_backend dietary_backend_simple 2>/dev/null || true
sudo docker rm dietary_backend dietary_backend_simple 2>/dev/null || true

# 2. Create a simple backend file
echo "2. Creating simple backend..."
cat > simple-backend.js << 'EOF'
const express = require('express');
const app = express();

// Enable CORS for all origins
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "*");
  res.header("Access-Control-Allow-Methods", "*");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date() });
});

// Login endpoint - hardcoded for admin/admin123
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  console.log('Login attempt:', username);
  
  if (username === 'admin' && password === 'admin123') {
    res.json({
      token: 'fake-jwt-token-' + Date.now(),
      user: {
        userId: 1,
        username: 'admin',
        fullName: 'Administrator',
        role: 'Admin'
      }
    });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// Dashboard stats endpoint
app.get('/api/dashboard/stats', (req, res) => {
  res.json({
    users: { total: 5, active: 3 },
    items: { total: 25, active: 20 },
    orders: { today: 15 },
    patients: { active: 30 }
  });
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend is working!' });
});

const PORT = 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Simple backend running on port ${PORT}`);
  console.log('Ready for connections...');
});
EOF

# 3. Run the backend using the file
echo "3. Starting backend..."
sudo docker run -d \
  --name dietary_backend \
  --network dietary_network \
  -p 3000:3000 \
  -v $(pwd)/simple-backend.js:/app/server.js \
  -w /app \
  node:18-alpine \
  sh -c "npm install express && node server.js"

# 4. Wait for it to start
echo "4. Waiting for backend to start (10 seconds)..."
for i in {1..10}; do
  echo -n "."
  sleep 1
done
echo ""

# 5. Test the backend
echo "5. Testing backend..."
echo ""
echo "Health check:"
curl -s http://localhost:3000/api/health | jq . 2>/dev/null || curl http://localhost:3000/api/health

echo ""
echo "Test endpoint:"
curl -s http://localhost:3000/api/test | jq . 2>/dev/null || curl http://localhost:3000/api/test

echo ""
echo "Login test:"
curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | jq . 2>/dev/null || \
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

echo ""
echo "==================="
echo "Backend setup complete!"
echo ""
echo "Now try logging in at:"
echo "http://192.168.1.74:8080"
echo ""
echo "Username: admin"
echo "Password: admin123"
echo ""
echo "To check backend logs:"
echo "sudo docker logs dietary_backend"
