const express = require('express');
const router = express.Router();

// System info endpoint
router.get('/info', (req, res) => {
  res.json({
    name: 'Hospital Dietary Management System',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

module.exports = router;
