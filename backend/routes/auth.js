const express = require('express');
const router = express.Router();

// Simple hardcoded authentication for testing
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    console.log(`Login attempt - Username: ${username}, Password: ${password}`);
    
    // For now, just check if it's admin/admin123
    if (username === 'admin' && password === 'admin123') {
        // Generate a simple token
        const token = 'token-' + Date.now() + '-admin';
        
        console.log('Login successful for admin');
        
        return res.json({
            token: token,
            user: {
                user_id: 1,
                username: 'admin',
                first_name: 'System',
                last_name: 'Administrator',
                role: 'Admin'
            }
        });
    }
    
    console.log('Login failed - invalid credentials');
    return res.status(401).json({ message: 'Invalid credentials' });
});

module.exports = router;
