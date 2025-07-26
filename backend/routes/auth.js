const express = require('express');
const router = express.Router();

router.post('/login', (req, res) => {
  // Minimal implementation - will be replaced with full version
  res.json({ token: 'dummy-token', user: { username: 'admin', role: 'Admin' } });
});

router.get('/verify', (req, res) => {
  res.json({ valid: true });
});

module.exports = router;
