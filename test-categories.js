const { Pool } = require('pg');

const pool = new Pool({
  host: 'dietary_postgres',
  port: 5432,
  database: 'dietary_db',
  user: 'dietary_user',
  password: 'DietarySecurePass2024!'
});

async function test() {
  try {
    console.log('Testing direct query...');
    const result = await pool.query('SELECT category_id, category_name FROM categories ORDER BY category_name');
    console.log(`Found ${result.rows.length} categories`);
    result.rows.forEach(cat => console.log(`  - ${cat.category_name}`));
    
    console.log('\nTesting with join...');
    const joinResult = await pool.query(`
      SELECT c.category_name as category, 
             COALESCE(COUNT(i.item_id), 0) as item_count
      FROM categories c
      LEFT JOIN items i ON c.category_name = i.category AND i.is_active = true
      GROUP BY c.category_name
      ORDER BY c.category_name
    `);
    console.log('Categories with counts:');
    joinResult.rows.forEach(cat => console.log(`  - ${cat.category}: ${cat.item_count} items`));
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

test();
