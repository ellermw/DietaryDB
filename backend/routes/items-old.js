const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

// Get all items
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM items WHERE is_active = true ORDER BY category, name'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching items:', error);
    res.status(500).json({ message: 'Error fetching items' });
  }
});

// Get categories
router.get('/categories', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT DISTINCT category FROM items ORDER BY category'
    );
    res.json(result.rows.map(row => row.category));
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ message: 'Error fetching categories' });
  }
});

// Create new item
router.post('/', [
  authenticateToken,
  authorizeRole('Admin', 'Kitchen'),
  body('name').notEmpty().trim(),
  body('category').notEmpty().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, category, description, is_ada_friendly, fluid_ml, carbs_g, sodium_mg, calories } = req.body;
    
    const result = await db.query(
      `INSERT INTO items (name, category, description, is_ada_friendly, fluid_ml, carbs_g, sodium_mg, calories) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING *`,
      [name, category, description || '', is_ada_friendly || false, fluid_ml, carbs_g, sodium_mg, calories]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating item:', error);
    res.status(500).json({ message: 'Error creating item' });
  }
});

// Update item
router.put('/:id', [
  authenticateToken,
  authorizeRole('Admin', 'Kitchen')
], async (req, res) => {
  try {
    const itemId = req.params.id;
    const { name, category, description, is_ada_friendly, fluid_ml, carbs_g, sodium_mg, calories } = req.body;
    
    const result = await db.query(
      `UPDATE items 
       SET name = $1, category = $2, description = $3, is_ada_friendly = $4, 
           fluid_ml = $5, carbs_g = $6, sodium_mg = $7, calories = $8, 
           modified_date = CURRENT_TIMESTAMP
       WHERE item_id = $9 AND is_active = true
       RETURNING *`,
      [name, category, description, is_ada_friendly, fluid_ml, carbs_g, sodium_mg, calories, itemId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Item not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating item:', error);
    res.status(500).json({ message: 'Error updating item' });
  }
});

// Delete item (soft delete)
router.delete('/:id', [
  authenticateToken,
  authorizeRole('Admin')
], async (req, res) => {
  try {
    const result = await db.query(
      'UPDATE items SET is_active = false WHERE item_id = $1 RETURNING name',
      [req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Item not found' });
    }
    
    res.json({ message: `Item "${result.rows[0].name}" deleted successfully` });
  } catch (error) {
    console.error('Error deleting item:', error);
    res.status(500).json({ message: 'Error deleting item' });
  }
});

module.exports = router;
