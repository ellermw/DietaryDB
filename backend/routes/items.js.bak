const express = require('express');
const db = require('../config/database');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

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

// Get all categories with item counts
router.get('/categories', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        c.category_id,
        c.category_name,
        COUNT(i.item_id) as item_count
      FROM categories c
      LEFT JOIN items i ON c.category_name = i.category AND i.is_active = true
      GROUP BY c.category_id, c.category_name
      ORDER BY c.category_name
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ message: 'Error fetching categories' });
  }
});

// Get categories list (simple)
router.get('/categories/list', authenticateToken, async (req, res) => {
  try {
    const result = await db.query('SELECT category_name FROM categories ORDER BY category_name');
    res.json(result.rows.map(row => row.category_name));
  } catch (error) {
    console.error('Error fetching categories list:', error);
    res.status(500).json({ message: 'Error fetching categories' });
  }
});

// Create new category
router.post('/categories', [
  authenticateToken,
  authorizeRole('Admin'),
  body('category_name').notEmpty().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { category_name } = req.body;
    const result = await db.query(
      'INSERT INTO categories (category_name) VALUES ($1) RETURNING *',
      [category_name]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      res.status(400).json({ message: 'Category already exists' });
    } else {
      console.error('Error creating category:', error);
      res.status(500).json({ message: 'Error creating category' });
    }
  }
});

// Delete category
router.delete('/categories/:id', [
  authenticateToken,
  authorizeRole('Admin')
], async (req, res) => {
  try {
    // First check if category has items
    const itemCheck = await db.query(
      'SELECT COUNT(*) as count FROM items WHERE category = (SELECT category_name FROM categories WHERE category_id = $1) AND is_active = true',
      [req.params.id]
    );
    
    if (parseInt(itemCheck.rows[0].count) > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete category with active items. Please reassign or delete items first.' 
      });
    }
    
    const result = await db.query(
      'DELETE FROM categories WHERE category_id = $1 RETURNING category_name',
      [req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    res.json({ message: `Category "${result.rows[0].category_name}" deleted successfully` });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ message: 'Error deleting category' });
  }
});

// Create new item
router.post('/', [
  authenticateToken,
  authorizeRole('Admin', 'User'),
  body('name').notEmpty().trim(),
  body('category').notEmpty().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, category, is_ada_friendly, fluid_ml, sodium_mg, carbs_g, calories } = req.body;
    
    const result = await db.query(
      `INSERT INTO items (name, category, is_ada_friendly, fluid_ml, sodium_mg, carbs_g, calories) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
      [name, category, is_ada_friendly || false, fluid_ml, sodium_mg, carbs_g, calories]
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
  authorizeRole('Admin', 'User')
], async (req, res) => {
  try {
    const { name, category, is_ada_friendly, fluid_ml, sodium_mg, carbs_g, calories } = req.body;
    
    const result = await db.query(
      `UPDATE items 
       SET name = $1, category = $2, is_ada_friendly = $3, 
           fluid_ml = $4, sodium_mg = $5, carbs_g = $6, calories = $7,
           modified_date = CURRENT_TIMESTAMP
       WHERE item_id = $8 AND is_active = true
       RETURNING *`,
      [name, category, is_ada_friendly, fluid_ml, sodium_mg, carbs_g, calories, req.params.id]
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
