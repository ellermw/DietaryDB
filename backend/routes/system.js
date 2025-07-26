const express = require('express');
const router = express.Router();

router.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

router.post('/test-connection', (req, res) => {
  res.json({ connected: true, message: 'Connection successful' });
});

router.get('/info', (req, res) => {
  res.json({ app_name: 'Hospital Dietary Management System', version: '1.0.0' });
});

module.exports = router;
