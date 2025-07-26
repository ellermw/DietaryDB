#!/bin/bash

# Quick Start Script - Creates ALL files needed to run the system
# This creates minimal versions of all files so you can get started quickly

set -e

echo "Hospital Dietary Management System - Quick Start"
echo "================================================"
echo "This script will create all necessary files to get you started."
echo ""

# Create all directories
echo "Creating directory structure..."
mkdir -p backend/{routes,middleware,config}
mkdir -p admin-frontend/{public,src/{pages,components,contexts}}
mkdir -p database
mkdir -p migration
mkdir -p backups

# Create backend .env placeholder
cat > backend/.env << 'EOF'
# This will be populated by setup.sh
EOF

# Create minimal route implementations
echo "Creating backend route stubs..."

# System routes (minimal for health check)
cat > backend/routes/system.js << 'EOF'
const express = require('express');
const router = express.Router();

router.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

router.post('/test-connection', (req, res) => {
  res.json({ connected: true, message: 'Connection successful' });
});

router.get('/info', (req, res) => {
  res.json({ app_name: 'Hospital Dietary Management System', version: '1.0.0' });
});

module.exports = router;
EOF

# Auth routes stub
cat > backend/routes/auth.js << 'EOF'
const express = require('express');
const router = express.Router();

router.post('/login', (req, res) => {
  // Minimal implementation - will be replaced with full version
  res.json({ token: 'dummy-token', user: { username: 'admin', role: 'Admin' } });
});

router.get('/verify', (req, res) => {
  res.json({ valid: true });
});

module.exports = router;
EOF

# Create stub files for other routes
for route in users patients items orders menus admin; do
  cat > backend/routes/${route}.js << 'EOF'
const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: 'Route not yet implemented' });
});

module.exports = router;
EOF
done

# Create all React page components
echo "Creating React components..."

# Create all page stubs
pages=("Patients" "Items" "Orders" "DefaultMenus" "Users" "AuditLogs")
for page in "${pages[@]}"; do
  cat > admin-frontend/src/pages/${page}.js << EOF
import React from 'react';

function ${page}() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900">${page}</h1>
      <p className="mt-4 text-gray-600">This page is under construction.</p>
    </div>
  );
}

export default ${page};
EOF
done

# Create a minimal Login page
cat > admin-frontend/src/pages/Login.js << 'EOF'
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    setLoading(true);
    // Simulate login
    setTimeout(() => {
      localStorage.setItem('authToken', 'dummy-token');
      navigate('/');
    }, 1000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <h2 className="text-3xl font-bold text-center">Login</h2>
        <form onSubmit={handleLogin} className="mt-8 space-y-6">
          <input type="text" placeholder="Username" className="w-full p-2 border rounded" required />
          <input type="password" placeholder="Password" className="w-full p-2 border rounded" required />
          <button type="submit" disabled={loading} className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600">
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
EOF

# Create a minimal Dashboard page
cat > admin-frontend/src/pages/Dashboard.js << 'EOF'
import React from 'react';

function Dashboard() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold">Active Patients</h3>
          <p className="text-3xl font-bold mt-2">0</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold">Today's Orders</h3>
          <p className="text-3xl font-bold mt-2">0</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold">Active Items</h3>
          <p className="text-3xl font-bold mt-2">0</p>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
EOF

# Create a minimal Backup page
cat > admin-frontend/src/pages/Backup.js << 'EOF'
import React from 'react';

function Backup() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Backup & Restore</h1>
      <div className="mt-6 bg-white p-6 rounded-lg shadow">
        <p className="text-gray-600">Backup functionality will be implemented here.</p>
        <button className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
          Create Backup
        </button>
      </div>
    </div>
  );
}

export default Backup;
EOF

# Create a minimal Layout component
cat > admin-frontend/src/components/Layout.js << 'EOF'
import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';

function Layout() {
  const navigate = useNavigate();
  
  const handleLogout = () => {
    localStorage.removeItem('authToken');
    navigate('/login');
  };

  const navigation = [
    { name: 'Dashboard', href: '/' },
    { name: 'Patients', href: '/patients' },
    { name: 'Items', href: '/items' },
    { name: 'Orders', href: '/orders' },
    { name: 'Menus', href: '/menus' },
    { name: 'Users', href: '/users' },
    { name: 'Backup', href: '/backup' },
    { name: 'Audit', href: '/audit' },
  ];

  return (
    <div className="flex h-screen bg-gray-100">
      <div className="w-64 bg-white shadow-md">
        <div className="p-4">
          <h2 className="text-xl font-bold">Dietary Admin</h2>
        </div>
        <nav className="mt-4">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) =>
                `block px-4 py-2 text-sm ${
                  isActive ? 'bg-blue-500 text-white' : 'text-gray-700 hover:bg-gray-200'
                }`
              }
            >
              {item.name}
            </NavLink>
          ))}
        </nav>
        <div className="absolute bottom-0 w-64 p-4">
          <button
            onClick={handleLogout}
            className="w-full bg-red-500 text-white py-2 rounded hover:bg-red-600"
          >
            Logout
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default Layout;
EOF

# Create a minimal AuthContext
cat > admin-frontend/src/contexts/AuthContext.js << 'EOF'
import React, { createContext, useState, useContext } from 'react';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user] = useState({ username: 'admin', role: 'Admin' });
  const [loading] = useState(false);

  const login = async () => {
    return { success: true };
  };

  const logout = () => {
    localStorage.removeItem('authToken');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
EOF

# Create database config stub
cat > backend/config/database.js << 'EOF'
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'postgres',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'dietary_db',
  user: process.env.DB_USER || 'dietary_user',
  password: process.env.DB_PASSWORD || 'password'
});

module.exports = { pool, query: (text, params) => pool.query(text, params) };
EOF

# Create auth middleware stub
cat > backend/middleware/auth.js << 'EOF'
const verifyToken = (req, res, next) => {
  // Minimal implementation - accepts all requests
  req.user = { user_id: 1, username: 'admin', role: 'Admin' };
  next();
};

const requireAdmin = (req, res, next) => {
  next();
};

module.exports = { verifyToken, requireAdmin, requireKitchen: requireAdmin, requireNurse: requireAdmin };
EOF

echo "✓ All files created successfully!"
echo ""
echo "Now you can run: ./setup.sh"
echo ""
echo "Note: These are minimal implementations to get the system running."
echo "You should replace them with the full implementations from the artifacts."
