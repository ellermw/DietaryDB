const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'dietary_postgres',
  port: 5432,
  database: process.env.DB_NAME || 'dietary_db',
  user: process.env.DB_USER || 'dietary_user',
  password: process.env.DB_PASSWORD || 'DietarySecurePass2024!'
});

// Get all categories with item counts
router.get('/', async (req, res) => {
  console.log('GET /api/categories - Fetching categories with counts');
  try {
    // Ensure table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS categories (
        category_id SERIAL PRIMARY KEY,
        category_name VARCHAR(100) UNIQUE NOT NULL,
        item_count INTEGER DEFAULT 0,
        created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by VARCHAR(100)
      )
    `);
    
    // Sync from items and update counts
    await pool.query(`
      INSERT INTO categories (category_name)
      SELECT DISTINCT category FROM items WHERE category IS NOT NULL
      ON CONFLICT (category_name) DO NOTHING
    `);
    
    await pool.query(`
      UPDATE categories c
      SET item_count = (
        SELECT COUNT(*) FROM items i 
        WHERE i.category = c.category_name AND i.is_active = true
      )
    `);
    
    const result = await pool.query(`
      SELECT category_id, category_name, item_count, created_date
      FROM categories
      ORDER BY category_name
    `);
    
    console.log(`Returning ${result.rows.length} categories`);
    res.json(result.rows);
  } catch (error) {
    console.error('Categories error:', error);
    res.status(500).json({ message: 'Error fetching categories', error: error.message });
  }
});

// Create new category
router.post('/', async (req, res) => {
  const { category_name } = req.body;
  console.log('POST /api/categories - Creating:', category_name);
  
  if (!category_name || !category_name.trim()) {
    return res.status(400).json({ message: 'Category name is required' });
  }
  
  try {
    const result = await pool.query(
      'INSERT INTO categories (category_name, item_count, created_by) VALUES ($1, 0, $2) RETURNING *',
      [category_name.trim(), req.user?.username || 'system']
    );
    
    // Log activity
    await pool.query(
      'INSERT INTO activity_log (user_id, username, action, details) VALUES ($1, $2, $3, $4)',
      [req.user?.userId, req.user?.username, 'CREATE_CATEGORY', `Created category: ${category_name}`]
    );
    
    console.log('Category created:', result.rows[0]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ message: 'Category already exists' });
    }
    console.error('Create category error:', error);
    res.status(500).json({ message: 'Error creating category' });
  }
});

// Delete category (only if no items)
router.delete('/:id', async (req, res) => {
  console.log('DELETE /api/categories/' + req.params.id);
  
  try {
    // Get category details and check for items
    const check = await pool.query(`
      SELECT c.*, 
        (SELECT COUNT(*) FROM items i WHERE i.category = c.category_name AND i.is_active = true) as active_items
      FROM categories c
      WHERE c.category_id = $1
    `, [req.params.id]);
    
    if (check.rows.length === 0) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    const category = check.rows[0];
    
    if (parseInt(category.active_items) > 0) {
      return res.status(400).json({ 
        message: `Cannot delete category "${category.category_name}" because it contains ${category.active_items} active items. Please remove or reassign these items first.`
      });
    }
    
    // Delete the category
    await pool.query('DELETE FROM categories WHERE category_id = $1', [req.params.id]);
    
    // Log activity
    await pool.query(
      'INSERT INTO activity_log (user_id, username, action, details) VALUES ($1, $2, $3, $4)',
      [req.user?.userId, req.user?.username, 'DELETE_CATEGORY', `Deleted category: ${category.category_name}`]
    );
    
    console.log('Category deleted:', category.category_name);
    res.json({ message: `Category "${category.category_name}" deleted successfully` });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ message: 'Error deleting category' });
  }
});

module.exports = router;
