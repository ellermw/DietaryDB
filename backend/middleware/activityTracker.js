const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'dietary_postgres',
  port: 5432,
  database: process.env.DB_NAME || 'dietary_db',
  user: process.env.DB_USER || 'dietary_user',
  password: process.env.DB_PASSWORD || 'DietarySecurePass2024!'
});

const trackActivity = async (req, res, next) => {
  try {
    const user = req.user || {};
    const action = `${req.method} ${req.path}`;
    const details = JSON.stringify({
      method: req.method,
      path: req.path,
      query: req.query,
      body: req.method === 'GET' ? undefined : req.body
    });
    
    await pool.query(
      'INSERT INTO activity_log (user_id, username, action, details, ip_address, user_agent) VALUES ($1, $2, $3, $4, $5, $6)',
      [user.userId, user.username, action, details, req.ip, req.get('user-agent')]
    );
  } catch (error) {
    console.error('Activity tracking error:', error);
  }
  next();
};

module.exports = { trackActivity };
