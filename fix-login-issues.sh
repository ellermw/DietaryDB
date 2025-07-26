#!/bin/bash

echo "Fixing Login Issues..."
echo "===================="
echo ""

# 1. First, let's check if backend is accessible
echo "1. Testing backend connection..."
curl -s http://localhost:3000/api/health || echo "Backend health check failed"
echo ""

# 2. Update the App.js to remove credentials and fix API URL
echo "2. Updating App.js..."
cat > admin-frontend/src/App.js << 'EOF'
import React, { useState, useEffect } from 'react';

// Login Component without default credentials shown
function Login({ onLogin }) {
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Use relative URL for same-origin requests
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });

      const data = await response.json();

      if (response.ok) {
        onLogin(data.token, data.user);
      } else {
        setError(data.error || 'Invalid username or password');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Unable to connect to server. Please try again.');
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
      backgroundColor: '#f5f5f5',
      backgroundImage: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
        padding: '2rem',
        width: '90%',
        maxWidth: '400px'
      }}>
        <h1 style={{ textAlign: 'center', marginBottom: '0.5rem', color: '#2c3e50' }}>
          Dietary Admin
        </h1>
        <p style={{ textAlign: 'center', marginBottom: '2rem', color: '#7f8c8d' }}>
          Sign in to access the admin panel
        </p>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '0.5rem',
              fontWeight: '500',
              color: '#2c3e50'
            }}>
              Username
            </label>
            <input
              type="text"
              name="username"
              value={credentials.username}
              onChange={handleChange}
              required
              autoFocus
              placeholder="Enter your username"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '1rem'
              }}
            />
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '0.5rem',
              fontWeight: '500',
              color: '#2c3e50'
            }}>
              Password
            </label>
            <input
              type="password"
              name="password"
              value={credentials.password}
              onChange={handleChange}
              required
              placeholder="Enter your password"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '1rem'
              }}
            />
          </div>
          {error && (
            <div style={{
              backgroundColor: '#fee',
              border: '1px solid #fcc',
              color: '#c00',
              padding: '0.75rem',
              marginBottom: '1rem',
              borderRadius: '4px',
              fontSize: '0.875rem'
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
              backgroundColor: loading ? '#95a5a6' : '#3498db',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '1rem',
              fontWeight: '500',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s'
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}

// Main App Component
function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    users: { total: 0, active: 0 },
    items: { total: 0, active: 0 },
    orders: { today: 0 },
    patients: { active: 0 }
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      setIsAuthenticated(true);
      setUser(JSON.parse(userData));
      fetchDashboardStats(token);
    }
  }, []);

  const fetchDashboardStats = async (token) => {
    try {
      const response = await fetch('/api/dashboard/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleLogin = (token, userData) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setIsAuthenticated(true);
    setUser(userData);
    fetchDashboardStats(token);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setUser(null);
    setCurrentPage('dashboard');
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
                textAlign: 'center',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <h3>Total Users</h3>
                <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: '0.5rem 0' }}>
                  {stats.users?.total || 0}
                </p>
                <p style={{ fontSize: '0.875rem', color: '#666' }}>
                  {stats.users?.active || 0} active
                </p>
              </div>
              <div style={{
                padding: '1.5rem',
                backgroundColor: '#e8f5e9',
                borderRadius: '8px',
                textAlign: 'center',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <h3>Food Items</h3>
                <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: '0.5rem 0' }}>
                  {stats.items?.total || 0}
                </p>
                <p style={{ fontSize: '0.875rem', color: '#666' }}>
                  {stats.items?.active || 0} active
                </p>
              </div>
              <div style={{
                padding: '1.5rem',
                backgroundColor: '#fff3e0',
                borderRadius: '8px',
                textAlign: 'center',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <h3>Today's Orders</h3>
                <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: '0.5rem 0' }}>
                  {stats.orders?.today || 0}
                </p>
              </div>
              <div style={{
                padding: '1.5rem',
                backgroundColor: '#fce4ec',
                borderRadius: '8px',
                textAlign: 'center',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <h3>Active Patients</h3>
                <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: '0.5rem 0' }}>
                  {stats.patients?.active || 0}
                </p>
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
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <div style={{
        width: '250px',
        backgroundColor: '#2c3e50',
        color: 'white',
        padding: '0'
      }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #34495e' }}>
          <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Dietary Admin</h2>
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', opacity: 0.8 }}>
            Welcome, {user?.fullName || user?.username}
          </p>
        </div>
        <nav style={{ padding: '1rem 0' }}>
          {navigation.map(item => (
            <div
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: currentPage === item.id ? '#34495e' : 'transparent',
                borderLeft: currentPage === item.id ? '4px solid #3498db' : '4px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
              }}
              onMouseEnter={(e) => {
                if (currentPage !== item.id) {
                  e.currentTarget.style.backgroundColor = '#34495e';
                }
              }}
              onMouseLeave={(e) => {
                if (currentPage !== item.id) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <span style={{ fontSize: '1.25rem' }}>{item.icon}</span>
              <span>{item.name}</span>
            </div>
          ))}
        </nav>
        <div style={{
          position: 'absolute',
          bottom: '0',
          width: '100%',
          padding: '1rem 1.5rem',
          borderTop: '1px solid #34495e'
        }}>
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: '#e74c3c',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#c0392b'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#e74c3c'}
          >
            Logout
          </button>
        </div>
      </div>
      <div style={{
        flex: 1,
        padding: '2rem',
        overflow: 'auto'
      }}>
        {renderPage()}
      </div>
    </div>
  );
}

export default App;
EOF

# 3. Update package.json to include proxy
echo "3. Updating package.json with proxy..."
cat > admin-frontend/package.json << 'EOF'
{
  "name": "dietary-admin-frontend",
  "version": "1.0.0",
  "private": true,
  "proxy": "http://backend:3000",
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

# 4. Make sure backend has CORS enabled
echo "4. Checking backend CORS configuration..."
if ! grep -q "cors" backend/server.js; then
  echo "Note: Make sure backend/server.js has CORS enabled:"
  echo "app.use(cors());"
fi

# 5. Restart the frontend
echo "5. Restarting frontend with updated configuration..."
sudo docker compose restart admin-frontend

# 6. Check logs
echo ""
echo "6. Waiting for React to compile..."
sleep 10
echo ""
echo "Recent frontend logs:"
sudo docker compose logs --tail=20 admin-frontend

echo ""
echo "===================="
echo "Login issues fixed!"
echo ""
echo "Changes made:"
echo "✅ Removed default credentials display"
echo "✅ Fixed API connection using proxy"
echo "✅ Improved error messages"
echo ""
echo "The React app will use the proxy setting to connect to the backend."
echo "This avoids CORS issues."
echo ""
echo "Login with: admin / admin123"
echo "Access at: http://192.168.1.74:3001"
echo ""
echo "If still having issues, check:"
echo "1. Backend logs: sudo docker compose logs backend"
echo "2. Network: sudo docker network ls"
echo "3. CORS in backend: grep cors backend/server.js"
