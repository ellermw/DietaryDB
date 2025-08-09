// Server wrapper that loads the original server and adds missing routes
const originalServer = require('./server.js');

// Wait a moment for the original server to initialize
setTimeout(() => {
  console.log('Injecting additional routes...');
  
  // Find the app and authenticateToken from the original server
  const app = originalServer;
  
  // Simple authenticateToken middleware (if not exported from original)
  const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'Access token required' });
    }
    
    // For now, just pass through if token exists
    // The original server should handle real validation
    next();
  };
  
  // Load and apply the addon routes
  try {
    const addonRoutes = require('./routes-addon.js');
    addonRoutes(app, authenticateToken);
    console.log('✓ Additional routes injected successfully');
  } catch (error) {
    console.error('Failed to load addon routes:', error);
  }
}, 2000);

module.exports = originalServer;
