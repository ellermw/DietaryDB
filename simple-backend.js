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
