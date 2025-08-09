const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

// Get all items
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { category, search, active } = req.query;
    let query = 'SELECT * FROM items WHERE 1=1';
    const params = [];
    let paramCount = 1;
    
    if (category) {
      query += ` AND category = $${paramCount++}`;
      params.push(category);
    }
    
    if (search) {
      query += ` AND name ILIKE $${paramCount++}`;
      params.push(`%${search}%`);
    }
    
    if (active !== undefined) {
      query += ` AND is_active = $${paramCount++}`;
      params.push(active === 'true');
    } else {
      query += ' AND is_active = true';
    }
    
    query += ' ORDER BY category, name';
    
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching items:', error);
    res.status(500).json({ message: 'Error fetching items' });
  }
});

// Get categories with item counts
router.get('/categories', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        category as category_name,
        COUNT(*) as item_count,
        SUM(CASE WHEN is_active = true THEN 1 ELSE 0 END) as active_count
      FROM items 
      WHERE category IS NOT NULL
      GROUP BY category
      ORDER BY category
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ message: 'Error fetching categories' });
  }
});

// Create new category (by creating first item in category)
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
    
    // Check if category already exists
    const existing = await db.query(
      'SELECT COUNT(*) as count FROM items WHERE category = $1',
      [category_name]
    );
    
    if (existing.rows[0].count > 0) {
      return res.status(400).json({ message: 'Category already exists' });
    }
    
    res.json({ 
      message: 'Category created successfully',
      category_name: category_name 
    });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ message: 'Error creating category' });
  }
});

// Delete category (only if no items)
router.delete('/categories/:name', [
  authenticateToken,
  authorizeRole('Admin')
], async (req, res) => {
  try {
    const categoryName = decodeURIComponent(req.params.name);
    
    // Check if category has items
    const itemCount = await db.query(
      'SELECT COUNT(*) as count FROM items WHERE category = $1',
      [categoryName]
    );
    
    if (itemCount.rows[0].count > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete category with existing items',
        item_count: itemCount.rows[0].count 
      });
    }
    
    res.json({ message: 'Category can be deleted (no items exist)' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ message: 'Error deleting category' });
  }
});

// Get single item
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM items WHERE item_id = $1',
      [req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Item not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching item:', error);
    res.status(500).json({ message: 'Error fetching item' });
  }
});

// Create new item
router.post('/', [
  authenticateToken,
  authorizeRole('Admin'),
  body('name').notEmpty().trim(),
  body('category').notEmpty().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { 
      name, 
      category, 
      is_ada_friendly = false,
      fluid_ml,
      sodium_mg,
      carbs_g,
      calories
    } = req.body;
    
    const result = await db.query(
      `INSERT INTO items 
       (name, category, is_ada_friendly, fluid_ml, sodium_mg, carbs_g, calories) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
      [name, category, is_ada_friendly, fluid_ml, sodium_mg, carbs_g, calories]
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
  authorizeRole('Admin')
], async (req, res) => {
  try {
    const { id } = req.params;
    const updates = [];
    const values = [];
    let paramCount = 1;

    const fields = ['name', 'category', 'is_ada_friendly', 'fluid_ml', 'sodium_mg', 'carbs_g', 'calories', 'is_active'];
    
    fields.forEach(field => {
      if (req.body.hasOwnProperty(field)) {
        updates.push(`${field} = $${paramCount++}`);
        values.push(req.body[field]);
      }
    });

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    updates.push(`modified_date = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
      UPDATE items 
      SET ${updates.join(', ')} 
      WHERE item_id = $${paramCount}
      RETURNING *
    `;

    const result = await db.query(query, values);

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

// Categories endpoints
router.get('/categories', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT category as name, COUNT(*) as item_count 
       FROM items 
       WHERE is_active = true AND category IS NOT NULL 
       GROUP BY category 
       ORDER BY category`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Categories error:', error);
    res.json([]);
  }
});

router.post('/categories', [authenticateToken, authorizeRole('Admin')], async (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ message: 'Category name required' });
  }
  // Categories are implicit in items
  res.json({ message: 'Category will be created when you add items', name: name });
});

router.delete('/categories/:name', [authenticateToken, authorizeRole('Admin')], async (req, res) => {
  try {
    // Set items in this category to 'Uncategorized'
    await db.query(
      `UPDATE items SET category = 'Uncategorized' WHERE category = $1`,
      [req.params.name]
    );
    res.json({ message: 'Category removed' });
  } catch (error) {
    res.status(500).json({ message: 'Error removing category' });
  }
});
