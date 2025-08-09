const express = require('express');
const db = require('../config/database');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

// Get all categories
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Check if categories table exists
    const tableExists = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'categories'
      );
    `);
    
    if (tableExists.rows[0].exists) {
      // Get from categories table
      const result = await db.query(`
        SELECT 
          c.category_id,
          c.category_name,
          c.description,
          c.sort_order,
          COUNT(i.item_id) as item_count
        FROM categories c
        LEFT JOIN items i ON c.category_name = i.category
        GROUP BY c.category_id, c.category_name, c.description, c.sort_order
        ORDER BY c.sort_order, c.category_name
      `);
      res.json(result.rows);
    } else {
      // Get from items table
      const result = await db.query(`
        SELECT 
          category as category_name,
          COUNT(*) as item_count
        FROM items 
        WHERE category IS NOT NULL
        GROUP BY category
        ORDER BY category
      `);
      res.json(result.rows);
    }
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ message: 'Error fetching categories' });
  }
});

// Create new category
router.post('/', [
  authenticateToken,
  authorizeRole('Admin')
], async (req, res) => {
  try {
    const { category_name, description } = req.body;
    
    if (!category_name || !category_name.trim()) {
      return res.status(400).json({ message: 'Category name is required' });
    }
    
    // Create categories table if it doesn't exist
    await db.query(`
      CREATE TABLE IF NOT EXISTS categories (
        category_id SERIAL PRIMARY KEY,
        category_name VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        sort_order INTEGER DEFAULT 0,
        created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Insert new category
    const result = await db.query(
      'INSERT INTO categories (category_name, description) VALUES ($1, $2) RETURNING *',
      [category_name.trim(), description || null]
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
router.put('/:id', [
  authenticateToken,
  authorizeRole('Admin')
], async (req, res) => {
  try {
    const { category_name, description, sort_order } = req.body;
    
    const result = await db.query(
      'UPDATE categories SET category_name = $1, description = $2, sort_order = $3 WHERE category_id = $4 RETURNING *',
      [category_name, description, sort_order || 0, req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ message: 'Error updating category' });
  }
});

// Delete category
router.delete('/:id', [
  authenticateToken,
  authorizeRole('Admin')
], async (req, res) => {
  try {
    // Check if category has items
    const itemCount = await db.query(
      'SELECT COUNT(*) as count FROM items WHERE category = (SELECT category_name FROM categories WHERE category_id = $1)',
      [req.params.id]
    );
    
    if (itemCount.rows[0].count > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete category with existing items',
        item_count: itemCount.rows[0].count 
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

module.exports = router;
