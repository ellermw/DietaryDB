#!/bin/bash

echo "Quick Database Authentication Fix"
echo "================================"
echo ""

# Simple fix - ensure consistent password everywhere
echo "1. Setting consistent database password..."

# Create/update .env file
cat > .env << 'EOF'
DB_PASSWORD=DietarySecurePass2024!
JWT_SECRET=your-super-secret-jwt-key-change-this
EOF

echo "2. Restarting containers with correct password..."
sudo docker compose down
sudo docker compose up -d

echo ""
echo "3. Waiting for services to start (15 seconds)..."
sleep 15

echo ""
echo "4. Testing connections:"
echo -n "Database health: "
sudo docker exec dietary_postgres pg_isready -U dietary_user -d dietary_db && echo "✅ OK" || echo "❌ Failed"

echo -n "Backend health: "
curl -s http://localhost:3000/api/health | grep -q "healthy" && echo "✅ OK" || echo "❌ Failed"

echo ""
echo "5. Testing login:"
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  -s | grep -q "token" && echo "✅ Login works!" || echo "❌ Login failed"

echo ""
echo "================================"
echo "Database fix complete!"
echo ""
echo "You can now login at: http://192.168.1.74:3001"
echo "Username: admin"
echo "Password: admin123"
