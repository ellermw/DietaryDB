#!/bin/bash

echo "Creating All React Admin Components..."
echo "====================================="
echo ""

# Create directories
mkdir -p admin-frontend/src/pages
mkdir -p admin-frontend/public

# 1. Create index.js
echo "Creating src/index.js..."
cat > admin-frontend/src/index.js << 'EOF'
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
EOF

# 2. Create public/index.html
echo "Creating public/index.html..."
cat > admin-frontend/public/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Dietary Admin Dashboard</title>
</head>
<body>
  <noscript>You need to enable JavaScript to run this application.</noscript>
  <div id="root"></div>
</body>
</html>
EOF

# 3. Create package.json
echo "Creating package.json..."
cat > admin-frontend/package.json << 'EOF'
{
  "name": "dietary-admin-frontend",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-scripts": "5.0.1"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  },
  "eslintConfig": {
    "extends": ["react-app"]
  },
  "browserslist": {
    "production": [">0.2%", "not dead", "not op_mini all"],
    "development": ["last 1 chrome version", "last 1 firefox version", "last 1 safari version"]
  }
}
EOF

# 4. Create simplified App.js that doesn't require separate files
echo "Creating src/App.js with all components inline..."
cat > admin-frontend/src/App.js << 'EOF'
import React, { useState, useEffect } from 'react';

// Inline Login Component
function Login({ onLogin }) {
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });

      const data = await response.json();

      if (response.ok) {
        onLogin(data.token, data.user);
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (error) {
      setError('Connection error. Please check if the server is running.');
    }
    
    setLoading(false);
  };

  const handleChange = (e) => {
    setCredentials({
      ...credentials,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f5f5f5'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
        padding: '2rem',
        width: '90%',
        maxWidth: '400px'
      }}>
        <h1 style={{ textAlign: 'center', marginBottom: '2rem' }}>Dietary Admin</h1>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Username</label>
            <input
              type="text"
              name="username"
              value={credentials.username}
              onChange={handleChange}
              required
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px'
              }}
            />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Password</label>
            <input
              type="password"
              name="password"
              value={credentials.password}
              onChange={handleChange}
              required
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px'
              }}
            />
          </div>
          {error && (
            <div style={{
              backgroundColor: '#fee',
              color: '#c00',
              padding: '0.5rem',
              marginBottom: '1rem',
              borderRadius: '4px'
            }}>
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: loading ? '#ccc' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <div style={{
          marginTop: '2rem',
          padding: '1rem',
          backgroundColor: '#f8f9fa',
          borderRadius: '4px',
          fontSize: '0.875rem',
          textAlign: 'center'
        }}>
          <p>Default credentials:</p>
          <code>admin / admin123</code>
        </div>
      </div>
    </div>
  );
}

// Main App Component
function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      setIsAuthenticated(true);
      setUser(JSON.parse(userData));
    }
  }, []);

  const handleLogin = (token, userData) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setIsAuthenticated(true);
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setUser(null);
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  const navigation = [
    { id: 'dashboard', name: 'Dashboard', icon: '📊' },
    { id: 'items', name: 'Items / Categories', icon: '🍽️' },
    { id: 'users', name: 'Users', icon: '👥' },
    { id: 'backup', name: 'Backup / Restore', icon: '💾' },
    { id: 'audit', name: 'Audit Logs', icon: '📋' }
  ];

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return (
          <div>
            <h1>Dashboard</h1>
            <p>Welcome to the Dietary Management System</p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '1rem',
              marginTop: '2rem'
            }}>
              <div style={{
                padding: '1.5rem',
                backgroundColor: '#e3f2fd',
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <h3>Total Users</h3>
                <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>0</p>
              </div>
              <div style={{
                padding: '1.5rem',
                backgroundColor: '#e8f5e9',
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <h3>Food Items</h3>
                <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>0</p>
              </div>
              <div style={{
                padding: '1.5rem',
                backgroundColor: '#fff3e0',
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <h3>Today's Orders</h3>
                <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>0</p>
              </div>
              <div style={{
                padding: '1.5rem',
                backgroundColor: '#fce4ec',
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <h3>Active Patients</h3>
                <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>0</p>
              </div>
            </div>
          </div>
        );
      case 'items':
        return (
          <div>
            <h1>Items / Categories</h1>
            <p>Manage food items and categories</p>
            <button style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              marginTop: '1rem',
              cursor: 'pointer'
            }}>
              + Add New Item
            </button>
          </div>
        );
      case 'users':
        return (
          <div>
            <h1>User Management</h1>
            <p>Manage system users and permissions</p>
            <button style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              marginTop: '1rem',
              cursor: 'pointer'
            }}>
              + Add New User
            </button>
          </div>
        );
      case 'backup':
        return (
          <div>
            <h1>Backup / Restore</h1>
            <p>Manage database backups</p>
            <button style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              marginTop: '1rem',
              cursor: 'pointer'
            }}>
              Create Backup Now
            </button>
          </div>
        );
      case 'audit':
        return (
          <div>
            <h1>Audit Logs</h1>
            <p>View system activity logs</p>
          </div>
        );
      default:
        return <div>Page not found</div>;
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <div style={{
        width: '250px',
        backgroundColor: '#343a40',
        color: 'white',
        padding: '1rem'
      }}>
        <h2 style={{ marginBottom: '2rem' }}>Dietary Admin</h2>
        <nav>
          {navigation.map(item => (
            <div
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              style={{
                padding: '0.75rem',
                marginBottom: '0.5rem',
                backgroundColor: currentPage === item.id ? '#495057' : 'transparent',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              {item.icon} {item.name}
            </div>
          ))}
        </nav>
        <div style={{
          position: 'absolute',
          bottom: '1rem',
          left: '1rem',
          right: '1rem'
        }}>
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Logout
          </button>
        </div>
      </div>
      <div style={{
        flex: 1,
        padding: '2rem',
        backgroundColor: '#f8f9fa'
      }}>
        {renderPage()}
      </div>
    </div>
  );
}

export default App;
EOF

echo ""
echo "All React components created!"
echo ""
echo "Now running setup script..."

# Run the setup script
bash setup-full-admin.sh
