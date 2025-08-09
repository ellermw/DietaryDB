const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Simple auth middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ message: 'Access token required' });
    }
    
    // For now, just check if token starts with 'token-'
    if (token.startsWith('token-')) {
        req.user = { username: 'admin', role: 'Admin' };
        next();
    } else {
        res.status(403).json({ message: 'Invalid token' });
    }
};

// Routes
try {
    const authRoutes = require('./routes/auth');
    app.use('/api/auth', authRoutes);
    console.log('Auth routes loaded');
} catch (err) {
    console.error('Failed to load auth routes:', err);
}

try {
    const dashboardRoutes = require('./routes/dashboard');
    app.use('/api/dashboard', authenticateToken, dashboardRoutes);
    console.log('Dashboard routes loaded');
} catch (err) {
    console.error('Failed to load dashboard routes:', err);
}

// Simple fallback routes
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    console.log(`Fallback login - Username: ${username}`);
    
    if (username === 'admin' && password === 'admin123') {
        res.json({
            token: 'token-' + Date.now(),
            user: {
                username: 'admin',
                first_name: 'System',
                last_name: 'Administrator',
                role: 'Admin'
            }
        });
    } else {
        res.status(401).json({ message: 'Invalid credentials' });
    }
});

app.get('/api/dashboard', authenticateToken, (req, res) => {
    res.json({
        totalItems: 5,
        totalUsers: 1,
        totalCategories: 3,
        recentActivity: []
    });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`
====================================
Simple Backend Server Running
Port: ${PORT}
Time: ${new Date().toISOString()}
====================================
    `);
});
