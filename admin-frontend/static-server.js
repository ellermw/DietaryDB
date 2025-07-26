const express = require('express');
const app = express();
const PORT = 3000;

// Simple admin panel HTML
const adminHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dietary Admin Dashboard</title>
</head>
<body>
    <div style="display: flex; align-items: center; justify-content: center; height: 100vh; background: #f5f5f5;">
        <div style="text-align: center; padding: 2rem; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h1>Dietary Admin Dashboard</h1>
            <p>Welcome! The admin panel is working.</p>
            <p style="margin-top: 2rem;">
                Backend API: http://192.168.1.74:3000<br>
                Frontend: http://192.168.1.74:3001
            </p>
            <p style="margin-top: 1rem; color: #666;">
                Default login: admin / admin123
            </p>
        </div>
    </div>
</body>
</html>
`;

app.get('*', (req, res) => {
    res.send(adminHTML);
});

app.listen(PORT, () => {
    console.log('Admin dashboard running on port ' + PORT);
});
