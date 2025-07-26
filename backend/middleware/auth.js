const verifyToken = (req, res, next) => {
  // Minimal implementation - accepts all requests
  req.user = { user_id: 1, username: 'admin', role: 'Admin' };
  next();
};

const requireAdmin = (req, res, next) => {
  next();
};

module.exports = { verifyToken, requireAdmin, requireKitchen: requireAdmin, requireNurse: requireAdmin };
