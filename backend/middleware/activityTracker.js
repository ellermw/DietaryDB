// /opt/dietarydb/backend/middleware/activityTracker.js
const db = require('../config/database');

// Track user activity on each authenticated request
const trackActivity = async (req, res, next) => {
  if (req.user && req.user.user_id) {
    try {
      // Update last_activity timestamp
      await db.query(
        'UPDATE users SET last_activity = CURRENT_TIMESTAMP WHERE user_id = $1',
        [req.user.user_id]
      );
    } catch (error) {
      console.error('Error tracking activity:', error);
      // Don't block the request if activity tracking fails
    }
  }
  next();
};

// Get active users (users who have been active in the last 5 minutes)
const getActiveUsers = async () => {
  try {
    const result = await db.query(
      `SELECT user_id, username, full_name, role, last_activity 
       FROM users 
       WHERE last_activity > NOW() - INTERVAL '5 minutes' 
       AND is_active = true
       ORDER BY last_activity DESC`
    );
    return result.rows;
  } catch (error) {
    console.error('Error fetching active users:', error);
    return [];
  }
};

// Check if a specific user is online
const isUserOnline = async (userId) => {
  try {
    const result = await db.query(
      `SELECT COUNT(*) as count 
       FROM users 
       WHERE user_id = $1 
       AND last_activity > NOW() - INTERVAL '5 minutes' 
       AND is_active = true`,
      [userId]
    );
    return result.rows[0].count > 0;
  } catch (error) {
    console.error('Error checking user online status:', error);
    return false;
  }
};

// Get activity summary
const getActivitySummary = async () => {
  try {
    const result = await db.query(`
      SELECT 
        COUNT(DISTINCT user_id) FILTER (WHERE last_activity > NOW() - INTERVAL '5 minutes') as users_online,
        COUNT(DISTINCT user_id) FILTER (WHERE last_activity > NOW() - INTERVAL '1 hour') as users_last_hour,
        COUNT(DISTINCT user_id) FILTER (WHERE last_activity > NOW() - INTERVAL '24 hours') as users_last_day
      FROM users
      WHERE is_active = true
    `);
    return result.rows[0];
  } catch (error) {
    console.error('Error fetching activity summary:', error);
    return { users_online: 0, users_last_hour: 0, users_last_day: 0 };
  }
};

module.exports = { 
  trackActivity, 
  getActiveUsers, 
  isUserOnline,
  getActivitySummary
};