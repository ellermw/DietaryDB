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
