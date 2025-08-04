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
    // First try to get from categories table if it exists
    try {
      const result = await db.query(
        'SELECT category_name, description, sort_order FROM categories ORDER BY sort_order, category_name'
      );
      res.json(result.rows);
    } catch (err) {
      // If categories table doesn't exist, get distinct from items
      const result = await db.query(
        'SELECT DISTINCT category as category_name FROM items WHERE category IS NOT NULL ORDER BY category'
      );
      res.json(result.rows);
    }
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ message: 'Error fetching categories' });
  }
});

// Create category
router.post('/categories', [
  authenticateToken,
  authorizeRole('Admin'),
  body('category_name').notEmpty().trim()
], async (req, res) => {
  try {
    const { category_name, description, sort_order } = req.body;
    
    // Create categories table if it doesn't exist
    await db.query(`
      CREATE TABLE IF NOT EXISTS categories (
        category_id SERIAL PRIMARY KEY,
        category_name VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        sort_order INTEGER DEFAULT 0,
        created_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    const result = await db.query(
      'INSERT INTO categories (category_name, description, sort_order) VALUES ($1, $2, $3) RETURNING *',
      [category_name, description || '', sort_order || 0]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') { // Unique violation
      res.status(400).json({ message: 'Category already exists' });
    } else {
      console.error('Error creating category:', error);
      res.status(500).json({ message: 'Error creating category' });
    }
  }
});

// Update category
router.put('/categories/:name', [
  authenticateToken,
  authorizeRole('Admin')
], async (req, res) => {
  try {
    const oldName = req.params.name;
    const { category_name, description, sort_order } = req.body;
    
    // Update in categories table
    try {
      await db.query(
        'UPDATE categories SET category_name = $1, description = $2, sort_order = $3 WHERE category_name = $4',
        [category_name || oldName, description, sort_order, oldName]
      );
    } catch (err) {
      console.log('Categories table might not exist');
    }
    
    // Update items with this category
    if (category_name && category_name !== oldName) {
      await db.query(
        'UPDATE items SET category = $1 WHERE category = $2',
        [category_name, oldName]
      );
    }
    
    res.json({ message: 'Category updated successfully' });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ message: 'Error updating category' });
  }
});

// Delete category
router.delete('/categories/:name', [
  authenticateToken,
  authorizeRole('Admin')
], async (req, res) => {
  try {
    const categoryName = req.params.name;
    
    // Check if items exist with this category
    const itemsResult = await db.query(
      'SELECT COUNT(*) as count FROM items WHERE category = $1 AND is_active = true',
      [categoryName]
    );
    
    if (itemsResult.rows[0].count > 0) {
      return res.status(400).json({ 
        message: `Cannot delete category. ${itemsResult.rows[0].count} items are using this category.` 
      });
    }
    
    // Delete from categories table if exists
    try {
      await db.query('DELETE FROM categories WHERE category_name = $1', [categoryName]);
    } catch (err) {
      console.log('Categories table might not exist');
    }
    
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ message: 'Error deleting category' });
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
