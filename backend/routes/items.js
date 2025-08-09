const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'dietary_postgres',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'dietary_db',
  user: process.env.DB_USER || 'dietary_user',
  password: process.env.DB_PASSWORD || 'DietarySecurePass2024!',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Get all items
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM items WHERE is_active = true ORDER BY name'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching items:', error);
    res.status(500).json({ message: 'Error fetching items' });
  }
});

// Get single item
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
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
router.post('/', [authenticateToken, authorizeRole('Admin')], async (req, res) => {
  const { name, category, calories, sodium_mg, carbs_g, protein_g, fat_g, fiber_g, sugar_g, fluid_ml, is_ada_friendly } = req.body;
  
  try {
    const result = await pool.query(
      `INSERT INTO items (name, category, calories, sodium_mg, carbs_g, protein_g, fat_g, fiber_g, sugar_g, fluid_ml, is_ada_friendly)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [name, category, calories, sodium_mg, carbs_g, protein_g, fat_g, fiber_g, sugar_g, fluid_ml, is_ada_friendly]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating item:', error);
    res.status(500).json({ message: 'Error creating item' });
  }
});

// Update item
router.put('/:id', [authenticateToken, authorizeRole('Admin')], async (req, res) => {
  const { name, category, calories, sodium_mg, carbs_g, protein_g, fat_g, fiber_g, sugar_g, fluid_ml, is_ada_friendly } = req.body;
  
  try {
    const result = await pool.query(
      `UPDATE items SET name = $1, category = $2, calories = $3, sodium_mg = $4,
       carbs_g = $5, protein_g = $6, fat_g = $7, fiber_g = $8, sugar_g = $9,
       fluid_ml = $10, is_ada_friendly = $11, updated_date = CURRENT_TIMESTAMP
       WHERE item_id = $12 RETURNING *`,
      [name, category, calories, sodium_mg, carbs_g, protein_g, fat_g, fiber_g, sugar_g, fluid_ml, is_ada_friendly, req.params.id]
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

// Delete single item
router.delete('/:id', [authenticateToken, authorizeRole('Admin')], async (req, res) => {
  try {
    const result = await pool.query(
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

// BULK DELETE - Delete multiple items
router.post('/bulk-delete', [authenticateToken, authorizeRole('Admin')], async (req, res) => {
  const { item_ids } = req.body;
  
  if (!item_ids || !Array.isArray(item_ids) || item_ids.length === 0) {
    return res.status(400).json({ message: 'No items selected for deletion' });
  }
  
  try {
    const placeholders = item_ids.map((_, i) => `$${i + 1}`).join(',');
    const result = await pool.query(
      `UPDATE items SET is_active = false 
       WHERE item_id IN (${placeholders}) 
       RETURNING name`,
      item_ids
    );
    
    res.json({ 
      message: `Successfully deleted ${result.rowCount} items`,
      deleted_items: result.rows.map(r => r.name)
    });
  } catch (error) {
    console.error('Error bulk deleting items:', error);
    res.status(500).json({ message: 'Error deleting items' });
  }
});

module.exports = router;
