const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', (req, res) => {
  res.json({ message: 'Endpoint not fully implemented yet', data: [] });
});

router.get('/stats/summary', (req, res) => {
  res.json({ 
    total: 0,
    active: 0
  });
});

module.exports = router;
