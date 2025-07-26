#!/bin/bash

echo "Fixing Frontend Connection and Login Display"
echo "==========================================="
echo ""

# 1. First check if backend is actually running
echo "1. Checking backend status:"
curl -s http://localhost:3000/api/health
echo ""

# 2. Update App.js to remove credentials and fix connection
echo "2. Updating App.js..."
cat > admin-frontend/src/App.js << 'EOF'
import React, { useState, useEffect } from 'react';

// Login Component - NO DEFAULT CREDENTIALS SHOWN
function Login({ onLogin }) {
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Use window.location.hostname to get the current server IP
      const apiUrl = `http://${window.location.hostname}:3000/api/auth/login`;
      
      const response = await fetch(apiUrl, {
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
      setError('Unable to connect to server. Please check your connection.');
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

// Main App Component with API calls updated
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

  // Helper function to make API calls
  const apiCall = async (endpoint, options = {}) => {
    const apiUrl = `http://${window.location.hostname}:3000${endpoint}`;
    const token = localStorage.getItem('token');
    
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      }
    };
    
    return fetch(apiUrl, { ...defaultOptions, ...options });
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      setIsAuthenticated(true);
      setUser(JSON.parse(userData));
      fetchDashboardStats();
    }
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const response = await apiCall('/api/dashboard/stats');
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
    fetchDashboardStats();
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
                transition: 'all 0.2s ease'
              }}
            >
              <span style={{ fontSize: '1.25rem', marginRight: '0.75rem' }}>{item.icon}</span>
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
              fontWeight: '500'
            }}
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

# 3. Restart the frontend to apply changes
echo "3. Restarting frontend..."
sudo docker compose -f docker-compose-working.yml restart admin-frontend

# 4. Test if backend is accessible from browser's perspective
echo ""
echo "4. Testing backend accessibility:"
echo "From server (should work):"
curl -s http://localhost:3000/api/health | grep -q "healthy" && echo "✓ Backend is healthy" || echo "✗ Backend not healthy"

echo ""
echo "From your IP (may have CORS issues):"
curl -s http://192.168.1.74:3000/api/health | grep -q "healthy" && echo "✓ Accessible" || echo "✗ Not accessible"

# 5. Check CORS configuration in backend
echo ""
echo "5. Checking backend CORS configuration:"
if grep -q "cors()" backend/server.js; then
    echo "✓ CORS middleware is present"
else
    echo "✗ CORS middleware missing - this is the problem!"
    echo ""
    echo "To fix, add this to backend/server.js after const app = express():"
    echo "app.use(cors());"
fi

echo ""
echo "==========================================="
echo "Changes applied:"
echo "✓ Removed default credentials from login page"
echo "✓ Updated API calls to use dynamic hostname"
echo ""
echo "The app now uses window.location.hostname to connect"
echo "to the backend, so it works from any IP address."
echo ""
echo "If still having connection issues:"
echo "1. Ensure CORS is enabled in backend/server.js"
echo "2. Check firewall: sudo ufw allow 3000"
echo "3. Restart backend: sudo docker compose -f docker-compose-working.yml restart backend"
