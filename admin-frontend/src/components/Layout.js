import React from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Layout = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  const navStyle = {
    backgroundColor: '#343a40',
    padding: '0',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  };

  const navLinkStyle = (active) => ({
    color: active ? '#fff' : '#adb5bd',
    textDecoration: 'none',
    padding: '15px 20px',
    display: 'inline-block',
    backgroundColor: active ? '#495057' : 'transparent',
    transition: 'all 0.3s'
  });

  const mainStyle = {
    minHeight: '100vh',
    backgroundColor: '#f8f9fa'
  };

  const contentStyle = {
    padding: '20px',
    maxWidth: '1200px',
    margin: '0 auto'
  };

  return (
    <div style={mainStyle}>
      <nav style={navStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <h3 style={{ margin: '0', padding: '15px 20px', color: '#fff' }}>Dietary Admin</h3>
            <Link to="/dashboard" style={navLinkStyle(isActive('/dashboard'))}>Dashboard</Link>
            <Link to="/patients" style={navLinkStyle(isActive('/patients'))}>Patients</Link>
            <Link to="/items" style={navLinkStyle(isActive('/items'))}>Items</Link>
            <Link to="/orders" style={navLinkStyle(isActive('/orders'))}>Orders</Link>
            <Link to="/users" style={navLinkStyle(isActive('/users'))}>Users</Link>
            {currentUser?.role === 'Admin' && (
              <Link to="/tasks" style={navLinkStyle(isActive('/tasks'))}>Tasks</Link>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ color: '#adb5bd', marginRight: '20px' }}>
              {currentUser?.full_name || currentUser?.username} ({currentUser?.role})
            </span>
            <button 
              onClick={handleLogout}
              style={{ 
                backgroundColor: '#dc3545', 
                color: 'white', 
                border: 'none', 
                padding: '8px 16px', 
                borderRadius: '4px',
                cursor: 'pointer',
                marginRight: '20px'
              }}
            >
              Logout
            </button>
          </div>
        </div>
      </nav>
      <div style={contentStyle}>
        <Outlet />
      </div>
    </div>
  );
};

export default Layout;
