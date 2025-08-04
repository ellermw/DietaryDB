const trackActivity = (req, res, next) => {
  // Simple activity tracking - can be enhanced later
  console.log(`Activity: ${req.method} ${req.path} by ${req.user?.username || 'anonymous'}`);
  next();
};

module.exports = { trackActivity };
