const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get orders for a specific date
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { date, patient_id, meal } = req.query;
    let query = `
      SELECT mo.*, pi.patient_first_name, pi.patient_last_name, 
             pi.wing, pi.room_number, pi.diet_type
      FROM meal_orders mo
      JOIN patient_info pi ON mo.patient_id = pi.patient_id
      WHERE 1=1
    `;
    const params = [];
    
    if (date) {
      params.push(date);
      query += ` AND mo.order_date = $${params.length}`;
    }
    
    if (patient_id) {
      params.push(patient_id);
      query += ` AND mo.patient_id = $${params.length}`;
    }
    
    if (meal) {
      params.push(meal);
      query += ` AND mo.meal = $${params.length}`;
    }
    
    query += ' ORDER BY mo.order_date DESC, pi.wing, pi.room_number';
    
    const result = await db.query(query, params);
    
    // Get order items for each order
    for (let order of result.rows) {
      const itemsResult = await db.query(
        `SELECT oi.*, i.name, i.category, i.description 
         FROM order_items oi
         JOIN items i ON oi.item_id = i.item_id
         WHERE oi.order_id = $1`,
        [order.order_id]
      );
      order.items = itemsResult.rows;
    }
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ message: 'Error fetching orders' });
  }
});

// Create new order
router.post('/', [
  authenticateToken,
  body('patient_id').isInt(),
  body('meal').isIn(['Breakfast', 'Lunch', 'Dinner']),
  body('order_date').isDate(),
  body('items').isArray().notEmpty()
], async (req, res) => {
  const client = await db.pool.connect();
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { patient_id, meal, order_date, items } = req.body;
    
    await client.query('BEGIN');
    
    // Create order
    const orderResult = await client.query(
      `INSERT INTO meal_orders (patient_id, meal, order_date, created_by) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [patient_id, meal, order_date, req.user.username]
    );
    
    const orderId = orderResult.rows[0].order_id;
    
    // Add order items
    for (let item of items) {
      await client.query(
        `INSERT INTO order_items (order_id, item_id, quantity, special_instructions) 
         VALUES ($1, $2, $3, $4)`,
        [orderId, item.item_id, item.quantity || 1, item.special_instructions]
      );
    }
    
    await client.query('COMMIT');
    
    // Fetch complete order with items
    const completeOrder = await db.query(
      `SELECT mo.*, pi.patient_first_name, pi.patient_last_name, 
              pi.wing, pi.room_number, pi.diet_type
       FROM meal_orders mo
       JOIN patient_info pi ON mo.patient_id = pi.patient_id
       WHERE mo.order_id = $1`,
      [orderId]
    );
    
    const orderItems = await db.query(
      `SELECT oi.*, i.name, i.category, i.description 
       FROM order_items oi
       JOIN items i ON oi.item_id = i.item_id
       WHERE oi.order_id = $1`,
      [orderId]
    );
    
    completeOrder.rows[0].items = orderItems.rows;
    
    res.status(201).json(completeOrder.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating order:', error);
    res.status(500).json({ message: 'Error creating order' });
  } finally {
    client.release();
  }
});

// Update order
router.put('/:id', authenticateToken, async (req, res) => {
  const client = await db.pool.connect();
  
  try {
    const orderId = req.params.id;
    const { items } = req.body;
    
    await client.query('BEGIN');
    
    // Delete existing items
    await client.query('DELETE FROM order_items WHERE order_id = $1', [orderId]);
    
    // Add new items
    for (let item of items) {
      await client.query(
        `INSERT INTO order_items (order_id, item_id, quantity, special_instructions) 
         VALUES ($1, $2, $3, $4)`,
        [orderId, item.item_id, item.quantity || 1, item.special_instructions]
      );
    }
    
    // Update modified date
    await client.query(
      'UPDATE meal_orders SET modified_date = CURRENT_TIMESTAMP WHERE order_id = $1',
      [orderId]
    );
    
    await client.query('COMMIT');
    
    res.json({ message: 'Order updated successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating order:', error);
    res.status(500).json({ message: 'Error updating order' });
  } finally {
    client.release();
  }
});

// Complete order
router.post('/:id/complete', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      `UPDATE meal_orders 
       SET is_complete = true, modified_date = CURRENT_TIMESTAMP 
       WHERE order_id = $1 
       RETURNING *`,
      [req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    res.json({ message: 'Order completed successfully', order: result.rows[0] });
  } catch (error) {
    console.error('Error completing order:', error);
    res.status(500).json({ message: 'Error completing order' });
  }
});

// Finalize orders for a date
router.post('/finalize', [
  authenticateToken,
  body('order_date').isDate()
], async (req, res) => {
  const client = await db.pool.connect();
  
  try {
    const { order_date } = req.body;
    
    await client.query('BEGIN');
    
    // Get all orders for the date
    const ordersResult = await client.query(
      `SELECT mo.*, pi.patient_first_name, pi.patient_last_name, 
              pi.wing, pi.room_number, pi.diet_type
       FROM meal_orders mo
       JOIN patient_info pi ON mo.patient_id = pi.patient_id
       WHERE mo.order_date = $1`,
      [order_date]
    );
    
    for (let order of ordersResult.rows) {
      // Create finalized order
      const finalizedResult = await client.query(
        `INSERT INTO finalized_order 
         (patient_name, wing, room, order_date, diet_type) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING order_id`,
        [
          `${order.patient_first_name} ${order.patient_last_name}`,
          order.wing,
          order.room_number,
          order_date,
          order.diet_type
        ]
      );
      
      const finalizedOrderId = finalizedResult.rows[0].order_id;
      
      // Get order items
      const itemsResult = await client.query(
        `SELECT oi.*, i.name, i.category 
         FROM order_items oi
         JOIN items i ON oi.item_id = i.item_id
         WHERE oi.order_id = $1`,
        [order.order_id]
      );
      
      // Insert finalized order items
      for (let item of itemsResult.rows) {
        await client.query(
          `INSERT INTO finalized_order_items 
           (order_id, meal_type, item_name, quantity, category) 
           VALUES ($1, $2, $3, $4, $5)`,
          [finalizedOrderId, order.meal, item.name, item.quantity, item.category]
        );
      }
    }
    
    await client.query('COMMIT');
    
    res.json({ 
      message: 'Orders finalized successfully', 
      count: ordersResult.rows.length 
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error finalizing orders:', error);
    res.status(500).json({ message: 'Error finalizing orders' });
  } finally {
    client.release();
  }
});

module.exports = router;