const express = require('express');
const router = express.Router();

// Minimal test route
router.get('/test', (req, res) => {
  res.json({ message: 'Tasks routes are working!' });
});

router.get('/database/stats', (req, res) => {
  res.json({
    database_size: "123456789",
    total_users: "2",
    total_patients: "0",
    total_orders: "0",
    total_backups: "0",
    last_backup: null
  });
});

module.exports = router;
