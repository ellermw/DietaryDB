const express = require('express');
const router = express.Router();

// Mock users data
const mockUsers = [
  { 
    user_id: 1, 
    username: 'admin', 
    first_name: 'System', 
    last_name: 'Administrator', 
    role: 'Admin', 
    is_active: true,
    last_login: new Date().toISOString(),
    created_date: '2024-01-01T00:00:00Z'
  },
  { 
    user_id: 2, 
    username: 'john_doe', 
    first_name: 'John', 
    last_name: 'Doe', 
    role: 'User', 
    is_active: true,
    last_login: null,
    created_date: '2024-01-15T00:00:00Z'
  },
  { 
    user_id: 3, 
    username: 'jane_smith', 
    first_name: 'Jane', 
    last_name: 'Smith', 
    role: 'User', 
    is_active: true,
    last_login: null,
    created_date: '2024-02-01T00:00:00Z'
  },
  { 
    user_id: 4, 
    username: 'mary_jones', 
    first_name: 'Mary', 
    last_name: 'Jones', 
    role: 'Admin', 
    is_active: false,
    last_login: null,
    created_date: '2024-02-15T00:00:00Z'
  }
];

// Get all users
router.get('/', async (req, res) => {
  console.log('Users route accessed');
  
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
    
    const result = await pool.query(
      'SELECT user_id, username, first_name, last_name, role, is_active, last_login, created_date FROM users ORDER BY username'
    );
    await pool.end();
    
    if (result.rows.length > 0) {
      return res.json(result.rows);
    }
  } catch (err) {
    console.log('Database query failed, using mock data:', err.message);
  }
  
  // Return mock data if database fails
  res.json(mockUsers);
});

module.exports = router;
