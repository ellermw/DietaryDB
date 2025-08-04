const express = require('express');
const router = express.Router();

// Placeholder routes for patients
router.get('/', (req, res) => {
  res.json({ message: 'Patients route - not implemented yet' });
});

module.exports = router;
