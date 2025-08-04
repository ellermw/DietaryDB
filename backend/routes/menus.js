const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

// Get default menu
router.get('/default', authenticateToken, async (req, res) => {
  try {
    const { diet_type, meal_type, day_of_week } = req.query;
    let query = 'SELECT * FROM default_menu WHERE is_active = true';
    const params = [];
    
    if (diet_type) {
      params.push(diet_type);
      query += ` AND diet_type = $${params.length}`;
    }
    
    if (meal_type) {
      params.push(meal_type);
      query += ` AND meal_type = $${params.length}`;
    }
    
    if (day_of_week) {
      params.push(day_of_week);
      query += ` AND day_of_week = $${params.length}`;
    }
    
    query += ' ORDER BY diet_type, meal_type, day_of_week, item_category';
    
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching default menu:', error);
    res.status(500).json({ message: 'Error fetching default menu' });
  }
});

// Save default menu
router.post('/default', [
  authenticateToken,
  authorizeRole('Admin', 'Kitchen'),
  body('diet_type').notEmpty(),
  body('meal_type').notEmpty(),
  body('day_of_week').notEmpty(),
  body('items').isArray()
], async (req, res) => {
  const client = await db.pool.connect();
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { diet_type, meal_type, day_of_week, items } = req.body;
    
    await client.query('BEGIN');
    
    // Delete existing menu items for this configuration
    await client.query(
      `DELETE FROM default_menu 
       WHERE diet_type = $1 AND meal_type = $2 AND day_of_week = $3`,
      [diet_type, meal_type, day_of_week]
    );
    
    // Insert new menu items
    for (let item of items) {
      await client.query(
        `INSERT INTO default_menu 
         (diet_type, meal_type, day_of_week, item_name, item_category) 
         VALUES ($1, $2, $3, $4, $5)`,
        [diet_type, meal_type, day_of_week, item.item_name, item.item_category]
      );
    }
    
    await client.query('COMMIT');
    
    res.json({ message: 'Default menu saved successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error saving default menu:', error);
    res.status(500).json({ message: 'Error saving default menu' });
  } finally {
    client.release();
  }
});

// Apply default menu to patient
router.post('/apply-default', [
  authenticateToken,
  body('patient_id').isInt(),
  body('date').isDate(),
  body('meal').isIn(['Breakfast', 'Lunch', 'Dinner'])
], async (req, res) => {
  const client = await db.pool.connect();
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { patient_id, date, meal } = req.body;
    
    // Get patient's diet type
    const patientResult = await client.query(
      'SELECT diet_type FROM patient_info WHERE patient_id = $1',
      [patient_id]
    );
    
    if (patientResult.rows.length === 0) {
      return res.status(404).json({ message: 'Patient not found' });
    }
    
    const dietType = patientResult.rows[0].diet_type;
    const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'long' });
    
    // Get default menu items
    const menuResult = await client.query(
      `SELECT dm.*, i.item_id 
       FROM default_menu dm
       JOIN items i ON dm.item_name = i.name
       WHERE dm.diet_type = $1 
         AND dm.meal_type = $2 
         AND dm.day_of_week = $3 
         AND dm.is_active = true`,
      [dietType, meal, dayOfWeek]
    );
    
    if (menuResult.rows.length === 0) {
      return res.status(404).json({ message: 'No default menu found for this configuration' });
    }
    
    await client.query('BEGIN');
    
    // Create order
    const orderResult = await client.query(
      `INSERT INTO meal_orders (patient_id, meal, order_date, created_by) 
       VALUES ($1, $2, $3, $4) 
       RETURNING order_id`,
      [patient_id, meal, date, req.user.username]
    );
    
    const orderId = orderResult.rows[0].order_id;
    
    // Add menu items to order
    for (let item of menuResult.rows) {
      await client.query(
        `INSERT INTO order_items (order_id, item_id, quantity) 
         VALUES ($1, $2, $3)`,
        [orderId, item.item_id, 1]
      );
    }
    
    await client.query('COMMIT');
    
    res.json({ 
      message: 'Default menu applied successfully', 
      order_id: orderId 
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error applying default menu:', error);
    res.status(500).json({ message: 'Error applying default menu' });
  } finally {
    client.release();
  }
});

module.exports = router;