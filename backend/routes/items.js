const express = require('express');
const router = express.Router();

// Hardcoded data for now to ensure it works
const mockItems = [
  { item_id: 1, name: 'Scrambled Eggs', category: 'Breakfast', calories: 140, sodium_mg: 180, carbs_g: 2, is_ada_friendly: false },
  { item_id: 2, name: 'Oatmeal', category: 'Breakfast', calories: 150, sodium_mg: 140, carbs_g: 27, is_ada_friendly: true },
  { item_id: 3, name: 'Whole Wheat Toast', category: 'Breakfast', calories: 70, sodium_mg: 150, carbs_g: 12, is_ada_friendly: true },
  { item_id: 4, name: 'Orange Juice', category: 'Beverages', calories: 110, sodium_mg: 2, carbs_g: 26, is_ada_friendly: true },
  { item_id: 5, name: 'Coffee', category: 'Beverages', calories: 2, sodium_mg: 5, carbs_g: 0, is_ada_friendly: true },
  { item_id: 6, name: 'Grilled Chicken', category: 'Lunch', calories: 165, sodium_mg: 440, carbs_g: 0, is_ada_friendly: false },
  { item_id: 7, name: 'Garden Salad', category: 'Lunch', calories: 35, sodium_mg: 140, carbs_g: 10, is_ada_friendly: true },
  { item_id: 8, name: 'Turkey Sandwich', category: 'Lunch', calories: 320, sodium_mg: 580, carbs_g: 42, is_ada_friendly: false },
  { item_id: 9, name: 'Apple', category: 'Snacks', calories: 95, sodium_mg: 2, carbs_g: 25, is_ada_friendly: true },
  { item_id: 10, name: 'Chocolate Cake', category: 'Desserts', calories: 350, sodium_mg: 370, carbs_g: 51, is_ada_friendly: true },
  { item_id: 11, name: 'Chicken Soup', category: 'Soups', calories: 120, sodium_mg: 890, carbs_g: 18, is_ada_friendly: false },
  { item_id: 12, name: 'French Fries', category: 'Sides', calories: 365, sodium_mg: 280, carbs_g: 48, is_ada_friendly: true }
];

// Get all items
router.get('/', async (req, res) => {
  console.log('Items route accessed');
  
  // Try database first
  try {
    const { Pool } = require('pg');
    const pool = new Pool({
      host: process.env.DB_HOST || 'postgres',
      port: 5432,
      database: 'dietary_db',
      user: 'dietary_user',
      password: process.env.DB_PASSWORD || 'DietarySecurePass2024!'
    });
    
    const result = await pool.query('SELECT * FROM items WHERE is_active = true ORDER BY category, name');
    await pool.end();
    
    if (result.rows.length > 0) {
      return res.json(result.rows);
    }
  } catch (err) {
    console.log('Database query failed, using mock data:', err.message);
  }
  
  // Return mock data if database fails
  res.json(mockItems);
});

// Get categories
router.get('/categories', async (req, res) => {
  const categories = ['Breakfast', 'Lunch', 'Dinner', 'Beverages', 'Snacks', 'Desserts', 'Sides', 'Soups'];
  res.json(categories);
});

module.exports = router;
