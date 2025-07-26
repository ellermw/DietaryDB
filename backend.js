const express = require('express');
const app = express();
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "*");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});
app.use(express.json());
app.get('/api/health', (req, res) => res.json({ status: 'healthy' }));
app.post('/api/auth/login', (req, res) => {
  if (req.body.username === 'admin' && req.body.password === 'admin123') {
    res.json({
      token: 'test-token',
      user: { userId: 1, username: 'admin', fullName: 'Admin', role: 'Admin' }
    });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});
app.listen(3000, () => console.log('Backend on port 3000'));
