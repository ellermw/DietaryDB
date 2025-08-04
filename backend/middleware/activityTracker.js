const trackActivity = async (req, res, next) => {
  try {
    console.log(`[${new Date().toISOString()}] ${req.user?.username || 'anonymous'} - ${req.method} ${req.path}`);
  } catch (error) {
    console.error('Activity tracking error:', error);
  }
  next();
};

module.exports = { trackActivity };
