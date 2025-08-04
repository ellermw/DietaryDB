const express = require('express');
const router = express.Router();

// Placeholder routes for orders
router.get('/', (req, res) => {
  res.json({ message: 'Orders route - not implemented yet' });
});

module.exports = router;
