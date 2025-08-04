import React from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navigation = [
    { path: '/dashboard', name: 'Dashboard', icon: '📊' },
    { path: '/patients', name: 'Patients', icon: '🏥' },
    { path: '/items', name: 'Items', icon: '🍽️' },
    { path: '/orders', name: 'Orders', icon: '📋' },
    { path: '/users', name: 'Users', icon: '👥', roles: ['Admin'] }
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={{
        width: '250px',
        backgroundColor: '#343a40',
        color: 'white',
        padding: '20px'
      }}>
        <h2 style={{ marginBottom: '30px', fontSize: '24px' }}>Dietary Admin</h2>
        
        <nav>
          {navigation.map(item => {
            if (item.roles && !item.roles.includes(user?.role)) {
              return null;
            }
            
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  display: 'block',
                  padding: '12px 16px',
                  marginBottom: '5px',
                  color: 'white',
                  textDecoration: 'none',
                  borderRadius: '4px',
                  backgroundColor: isActive(item.path) ? '#007bff' : 'transparent',
                  transition: 'background-color 0.3s'
                }}
              >
                <span style={{ marginRight: '10px' }}>{item.icon}</span>
                {item.name}
              </Link>
            );
          })}
        </nav>
        
        <div style={{ marginTop: 'auto', paddingTop: '40px' }}>
          <div style={{ borderTop: '1px solid #495057', paddingTop: '20px' }}>
            <p style={{ marginBottom: '10px' }}>
              {user?.full_name}<br />
              <small style={{ opacity: 0.7 }}>{user?.role}</small>
            </p>
            <button
              onClick={handleLogout}
              className="btn btn-secondary"
              style={{ width: '100%' }}
            >
              Logout
            </button>
          </div>
        </div>
      </aside>
      
      <main style={{ flex: 1, padding: '20px', backgroundColor: '#f8f9fa' }}>
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;