#!/bin/bash
# /opt/dietarydb/restore-full-dashboard.sh
# Restore the complete original DietaryDB dashboard with all features

set -e

echo "======================================"
echo "Restoring Complete DietaryDB Dashboard"
echo "======================================"

cd /opt/dietarydb

# Step 1: Create the complete React application structure
echo ""
echo "Step 1: Creating complete React application..."
echo "=============================================="

# Create directory structure
mkdir -p admin-frontend/src/components
mkdir -p admin-frontend/src/pages
mkdir -p admin-frontend/src/utils
mkdir -p admin-frontend/src/contexts

# Create axios configuration for API calls
cat > admin-frontend/src/utils/axios.js << 'EOF'
import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: '',  // Use relative URLs for proxy
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Request interceptor to add auth token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
EOF

# Create Auth Context
cat > admin-frontend/src/contexts/AuthContext.js << 'EOF'
import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from '../utils/axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // Verify token is still valid
      setUser({ token });
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    try {
      const response = await axios.post('/api/auth/login', { username, password });
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      setUser(user);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Login failed' };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    window.location.href = '/';
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
EOF

# Create Navigation Component
cat > admin-frontend/src/components/Navigation.js << 'EOF'
import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Navigation.css';

const Navigation = () => {
  const { user, logout } = useAuth();

  return (
    <nav className="navigation">
      <div className="nav-brand">
        <h2>DietaryDB</h2>
      </div>
      <div className="nav-links">
        <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'active' : ''}>
          Dashboard
        </NavLink>
        <NavLink to="/items" className={({ isActive }) => isActive ? 'active' : ''}>
          Items
        </NavLink>
        <NavLink to="/patients" className={({ isActive }) => isActive ? 'active' : ''}>
          Patients
        </NavLink>
        <NavLink to="/users" className={({ isActive }) => isActive ? 'active' : ''}>
          Users
        </NavLink>
        <NavLink to="/tasks" className={({ isActive }) => isActive ? 'active' : ''}>
          Tasks
        </NavLink>
      </div>
      <div className="nav-user">
        <span>Welcome, {user?.username || 'User'}</span>
        <button onClick={logout} className="logout-btn">Logout</button>
      </div>
    </nav>
  );
};

export default Navigation;
EOF

# Create Navigation CSS
cat > admin-frontend/src/components/Navigation.css << 'EOF'
.navigation {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: white;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.nav-brand h2 {
  margin: 0;
  font-size: 1.5rem;
}

.nav-links {
  display: flex;
  gap: 2rem;
}

.nav-links a {
  color: white;
  text-decoration: none;
  padding: 0.5rem 1rem;
  border-radius: 5px;
  transition: background 0.3s;
}

.nav-links a:hover {
  background: rgba(255,255,255,0.1);
}

.nav-links a.active {
  background: rgba(255,255,255,0.2);
}

.nav-user {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.logout-btn {
  background: white;
  color: #667eea;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 5px;
  cursor: pointer;
  font-weight: bold;
  transition: transform 0.2s;
}

.logout-btn:hover {
  transform: translateY(-2px);
}
EOF

# Create Dashboard Page
cat > admin-frontend/src/pages/Dashboard.js << 'EOF'
import React, { useState, useEffect } from 'react';
import axios from '../utils/axios';
import './Dashboard.css';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalItems: 0,
    totalUsers: 0,
    totalCategories: 0,
    totalPatients: 0,
    recentActivity: []
  });

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const response = await axios.get('/api/dashboard');
      setStats(response.data);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    }
  };

  return (
    <div className="dashboard">
      <h1>Dashboard</h1>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.totalItems}</div>
          <div className="stat-label">Total Items</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.totalUsers}</div>
          <div className="stat-label">Total Users</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.totalCategories}</div>
          <div className="stat-label">Categories</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.totalPatients || 0}</div>
          <div className="stat-label">Patients</div>
        </div>
      </div>
      
      <div className="recent-activity">
        <h2>Recent Activity</h2>
        {stats.recentActivity && stats.recentActivity.length > 0 ? (
          <ul>
            {stats.recentActivity.map((item, idx) => (
              <li key={idx}>
                <strong>{item.name}</strong> - {item.category}
              </li>
            ))}
          </ul>
        ) : (
          <p>No recent activity</p>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
EOF

# Create Items Page
cat > admin-frontend/src/pages/Items.js << 'EOF'
import React, { useState, useEffect } from 'react';
import axios from '../utils/axios';
import './Items.css';

const Items = () => {
  const [items, setItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    loadItems();
    loadCategories();
  }, []);

  const loadItems = async () => {
    try {
      const response = await axios.get('/api/items');
      setItems(response.data);
    } catch (error) {
      console.error('Error loading items:', error);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await axios.get('/api/items/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="items-page">
      <h1>Food Items</h1>
      
      <div className="filters">
        <input
          type="text"
          placeholder="Search items..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        <select 
          value={selectedCategory} 
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="category-filter"
        >
          <option value="">All Categories</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      <div className="items-table">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Category</th>
              <th>Calories</th>
              <th>Sodium (mg)</th>
              <th>Carbs (g)</th>
              <th>ADA Friendly</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map(item => (
              <tr key={item.item_id}>
                <td>{item.name}</td>
                <td>{item.category}</td>
                <td>{item.calories || '-'}</td>
                <td>{item.sodium_mg || '-'}</td>
                <td>{item.carbs_g || '-'}</td>
                <td>{item.is_ada_friendly ? '✓' : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Items;
EOF

# Create Users Page
cat > admin-frontend/src/pages/Users.js << 'EOF'
import React, { useState, useEffect } from 'react';
import axios from '../utils/axios';
import './Users.css';

const Users = () => {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await axios.get('/api/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  return (
    <div className="users-page">
      <h1>User Management</h1>
      
      <div className="users-table">
        <table>
          <thead>
            <tr>
              <th>Username</th>
              <th>Name</th>
              <th>Role</th>
              <th>Status</th>
              <th>Last Login</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.user_id}>
                <td>{user.username}</td>
                <td>{user.first_name} {user.last_name}</td>
                <td><span className={`role ${user.role.toLowerCase()}`}>{user.role}</span></td>
                <td>
                  <span className={`status ${user.is_active ? 'active' : 'inactive'}`}>
                    {user.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>{user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Users;
EOF

# Create Patients Page (placeholder)
cat > admin-frontend/src/pages/Patients.js << 'EOF'
import React from 'react';
import './Patients.css';

const Patients = () => {
  return (
    <div className="patients-page">
      <h1>Patient Management</h1>
      <p>Patient management features coming soon...</p>
    </div>
  );
};

export default Patients;
EOF

# Create Tasks Page
cat > admin-frontend/src/pages/Tasks.js << 'EOF'
import React, { useState, useEffect } from 'react';
import axios from '../utils/axios';
import './Tasks.css';

const Tasks = () => {
  const [dbStats, setDbStats] = useState(null);
  const [backupStatus, setBackupStatus] = useState('');

  useEffect(() => {
    loadDatabaseStats();
  }, []);

  const loadDatabaseStats = async () => {
    try {
      const response = await axios.get('/api/tasks/database/stats');
      setDbStats(response.data);
    } catch (error) {
      console.error('Error loading database stats:', error);
    }
  };

  const createBackup = async () => {
    setBackupStatus('Creating backup...');
    try {
      const response = await axios.post('/api/tasks/backup');
      setBackupStatus(`Backup created: ${response.data.filename}`);
    } catch (error) {
      setBackupStatus('Backup failed');
      console.error('Error creating backup:', error);
    }
  };

  return (
    <div className="tasks-page">
      <h1>System Tasks</h1>
      
      <div className="task-section">
        <h2>Database Management</h2>
        {dbStats && (
          <div className="db-stats">
            <p><strong>Database Size:</strong> {dbStats.database_size}</p>
            <p><strong>Total Tables:</strong> {dbStats.table_count}</p>
            <p><strong>Total Records:</strong> {dbStats.total_rows}</p>
            <p><strong>Last Check:</strong> {new Date(dbStats.last_check).toLocaleString()}</p>
          </div>
        )}
        
        <div className="backup-section">
          <button onClick={createBackup} className="backup-btn">Create Backup</button>
          {backupStatus && <p className="backup-status">{backupStatus}</p>}
        </div>
      </div>
    </div>
  );
};

export default Tasks;
EOF

# Create CSS files for pages
cat > admin-frontend/src/pages/Dashboard.css << 'EOF'
.dashboard {
  padding: 2rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 2rem;
  margin: 2rem 0;
}

.stat-card {
  background: white;
  padding: 2rem;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  text-align: center;
  transition: transform 0.3s;
}

.stat-card:hover {
  transform: translateY(-5px);
}

.stat-value {
  font-size: 3rem;
  font-weight: bold;
  color: #667eea;
}

.stat-label {
  color: #666;
  margin-top: 0.5rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-size: 0.875rem;
}

.recent-activity {
  background: white;
  padding: 2rem;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  margin-top: 2rem;
}

.recent-activity h2 {
  margin-bottom: 1rem;
  color: #333;
}

.recent-activity ul {
  list-style: none;
  padding: 0;
}

.recent-activity li {
  padding: 0.5rem 0;
  border-bottom: 1px solid #eee;
}
EOF

cat > admin-frontend/src/pages/Items.css << 'EOF'
.items-page {
  padding: 2rem;
}

.filters {
  display: flex;
  gap: 1rem;
  margin: 2rem 0;
}

.search-input, .category-filter {
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 1rem;
}

.search-input {
  flex: 1;
}

.items-table {
  background: white;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.items-table table {
  width: 100%;
  border-collapse: collapse;
}

.items-table th {
  background: #f8f9fa;
  padding: 1rem;
  text-align: left;
  font-weight: 600;
  color: #666;
  text-transform: uppercase;
  font-size: 0.875rem;
}

.items-table td {
  padding: 1rem;
  border-top: 1px solid #eee;
}

.items-table tr:hover {
  background: #f8f9fa;
}
EOF

cat > admin-frontend/src/pages/Users.css << 'EOF'
.users-page {
  padding: 2rem;
}

.users-table {
  background: white;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  margin-top: 2rem;
}

.users-table table {
  width: 100%;
  border-collapse: collapse;
}

.users-table th {
  background: #f8f9fa;
  padding: 1rem;
  text-align: left;
  font-weight: 600;
  color: #666;
  text-transform: uppercase;
  font-size: 0.875rem;
}

.users-table td {
  padding: 1rem;
  border-top: 1px solid #eee;
}

.role {
  padding: 0.25rem 0.75rem;
  border-radius: 15px;
  font-size: 0.875rem;
  font-weight: 500;
}

.role.admin {
  background: #e3f2fd;
  color: #1976d2;
}

.role.user {
  background: #f3e5f5;
  color: #7b1fa2;
}

.status {
  padding: 0.25rem 0.75rem;
  border-radius: 15px;
  font-size: 0.875rem;
  font-weight: 500;
}

.status.active {
  background: #e8f5e9;
  color: #2e7d32;
}

.status.inactive {
  background: #ffebee;
  color: #c62828;
}
EOF

cat > admin-frontend/src/pages/Patients.css << 'EOF'
.patients-page {
  padding: 2rem;
}
EOF

cat > admin-frontend/src/pages/Tasks.css << 'EOF'
.tasks-page {
  padding: 2rem;
}

.task-section {
  background: white;
  padding: 2rem;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  margin-top: 2rem;
}

.db-stats p {
  margin: 0.5rem 0;
  padding: 0.5rem;
  background: #f8f9fa;
  border-radius: 5px;
}

.backup-section {
  margin-top: 2rem;
}

.backup-btn {
  background: #667eea;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 5px;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.3s;
}

.backup-btn:hover {
  background: #5a67d8;
}

.backup-status {
  margin-top: 1rem;
  padding: 0.75rem;
  background: #e8f5e9;
  color: #2e7d32;
  border-radius: 5px;
}
EOF

# Create Login Page
cat > admin-frontend/src/pages/Login.js << 'EOF'
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Login.css';

const Login = () => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    const result = await login(username, password);
    
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="login-page">
      <form onSubmit={handleSubmit} className="login-form">
        <div className="login-header">
          <div className="login-logo">🏥</div>
          <h2>DietaryDB Login</h2>
        </div>
        
        {error && <div className="error-message">{error}</div>}
        
        <div className="form-group">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        
        <div className="form-group">
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        
        <button type="submit" disabled={loading} className="login-btn">
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
};

export default Login;
EOF

cat > admin-frontend/src/pages/Login.css << 'EOF'
.login-page {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-form {
  background: white;
  padding: 3rem;
  border-radius: 15px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
  width: 100%;
  max-width: 400px;
}

.login-header {
  text-align: center;
  margin-bottom: 2rem;
}

.login-logo {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.login-header h2 {
  color: #333;
  margin: 0;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 1rem;
  transition: border-color 0.3s;
}

.form-group input:focus {
  outline: none;
  border-color: #667eea;
}

.login-btn {
  width: 100%;
  padding: 0.75rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 5px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s;
}

.login-btn:hover:not(:disabled) {
  transform: translateY(-2px);
}

.login-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error-message {
  background: #fee;
  color: #c33;
  padding: 0.75rem;
  border-radius: 5px;
  margin-bottom: 1rem;
  text-align: center;
}
EOF

# Create main App.js with routing
cat > admin-frontend/src/App.js << 'EOF'
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Navigation from './components/Navigation';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Items from './pages/Items';
import Users from './pages/Users';
import Patients from './pages/Patients';
import Tasks from './pages/Tasks';
import './App.css';

const PrivateRoute = ({ children }) => {
  const { user } = useAuth();
  return user ? children : <Navigate to="/" />;
};

const AppContent = () => {
  const { user } = useAuth();
  
  return (
    <div className="App">
      {user && <Navigation />}
      <div className="main-content">
        <Routes>
          <Route path="/" element={user ? <Navigate to="/dashboard" /> : <Login />} />
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/items" element={<PrivateRoute><Items /></PrivateRoute>} />
          <Route path="/users" element={<PrivateRoute><Users /></PrivateRoute>} />
          <Route path="/patients" element={<PrivateRoute><Patients /></PrivateRoute>} />
          <Route path="/tasks" element={<PrivateRoute><Tasks /></PrivateRoute>} />
        </Routes>
      </div>
    </div>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;
EOF

# Update main App.css
cat > admin-frontend/src/App.css << 'EOF'
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background: #f5f7fa;
}

.App {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.main-content {
  flex: 1;
}

h1 {
  color: #333;
  margin-bottom: 1.5rem;
}

h2 {
  color: #555;
  margin-bottom: 1rem;
}
EOF

# Update package.json with necessary dependencies
cat > admin-frontend/package.json << 'EOF'
{
  "name": "dietarydb-admin",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.8.1",
    "axios": "^1.3.4",
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

# Step 2: Rebuild the frontend
echo ""
echo "Step 2: Rebuilding frontend with complete dashboard..."
echo "====================================================="

# Generate package-lock.json
cd admin-frontend
docker run --rm -v $(pwd):/app -w /app node:18-alpine npm install
cd ..

# Build the container
docker-compose build admin-frontend
docker-compose up -d admin-frontend

echo ""
echo "Step 3: Waiting for frontend to start..."
echo "========================================"
sleep 10

echo ""
echo "======================================"
echo "Complete Dashboard Restored!"
echo "======================================"
echo ""
echo "The full DietaryDB dashboard has been restored with:"
echo "✓ Dashboard with statistics"
echo "✓ Items management page"
echo "✓ Users management page"
echo "✓ Patients page (placeholder)"
echo "✓ Tasks and backup management"
echo "✓ Navigation menu"
echo "✓ Proper routing"
echo ""
echo "Access the application:"
echo "1. Clear your browser cache (Ctrl+Shift+Delete)"
echo "2. Go to http://15.204.252.189:3001"
echo "3. Login with: admin / admin123"
echo ""
echo "You will now have the complete dashboard with all pages!"
echo ""
