import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  FaHome,
  FaUserInjured,
  FaUtensils,
  FaClipboardList,
  FaCalendarAlt,
  FaUsers,
  FaDatabase,
  FaHistory,
  FaSignOutAlt,
  FaBars,
  FaTimes,
  FaHospital,
  FaUser
} from 'react-icons/fa';

function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navigation = [
    { name: 'Dashboard', href: '/', icon: FaHome },
    { name: 'Patients', href: '/patients', icon: FaUserInjured },
    { name: 'Food Items', href: '/items', icon: FaUtensils },
    { name: 'Orders', href: '/orders', icon: FaClipboardList },
    { name: 'Default Menus', href: '/menus', icon: FaCalendarAlt },
  ];

  const adminNavigation = [
    { name: 'Users', href: '/users', icon: FaUsers },
    { name: 'Backup & Restore', href: '/backup', icon: FaDatabase },
    { name: 'Audit Logs', href: '/audit', icon: FaHistory },
  ];

  const NavItem = ({ item }) => (
    <NavLink
      to={item.href}
      className={({ isActive }) =>
        `group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
          isActive
            ? 'bg-blue-100 text-blue-900'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
        }`
      }
      onClick={() => setSidebarOpen(false)}
    >
      <item.icon
        className="mr-3 flex-shrink-0 h-5 w-5"
        aria-hidden="true"
      />
      {item.name}
    </NavLink>
  );

  return (
    <div className="h-screen flex overflow-hidden bg-gray-100">
      {/* Mobile sidebar */}
      <div className={`lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 flex z-40">
          <div className="fixed inset-0" aria-hidden="true">
            <div className="absolute inset-0 bg-gray-600 opacity-75"></div>
          </div>
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                type="button"
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                onClick={() => setSidebarOpen(false)}
              >
                <span className="sr-only">Close sidebar</span>
                <FaTimes className="h-6 w-6 text-white" />
              </button>
            </div>
            <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
              <div className="flex items-center flex-shrink-0 px-4">
                <FaHospital className="h-8 w-8 text-blue-600 mr-3" />
                <span className="text-xl font-semibold">Dietary Admin</span>
              </div>
              <nav className="mt-5 px-2 space-y-1">
                {navigation.map((item) => (
                  <NavItem key={item.name} item={item} />
                ))}
                {user?.role === 'Admin' && (
                  <>
                    <div className="pt-4">
                      <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Administration
                      </p>
                    </div>
                    {adminNavigation.map((item) => (
                      <NavItem key={item.name} item={item} />
                    ))}
                  </>
                )}
              </nav>
            </div>
            <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
              <div className="flex items-center">
                <div>
                  <FaUser className="inline-block h-9 w-9 rounded-full text-gray-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-700">{user?.full_name}</p>
                  <p className="text-xs font-medium text-gray-500">{user?.role}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="flex-shrink-0 w-14" aria-hidden="true"></div>
        </div>
      </div>

      {/* Static sidebar for desktop */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <div className="flex flex-col w-64">
          <div className="flex-1 flex flex-col min-h-0 bg-white shadow-lg">
            <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
              <div className="flex items-center flex-shrink-0 px-4">
                <FaHospital className="h-8 w-8 text-blue-600 mr-3" />
                <span className="text-xl font-semibold">Dietary Admin</span>
              </div>
              <nav className="mt-5 flex-1 px-2 space-y-1">
                {navigation.map((item) => (
                  <NavItem key={item.name} item={item} />
                ))}
                {user?.role === 'Admin' && (
                  <>
                    <div className="pt-4">
                      <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Administration
                      </p>
                    </div>
                    {adminNavigation.map((item) => (
                      <NavItem key={item.name} item={item} />
                    ))}
                  </>
                )}
              </nav>
            </div>
            <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
              <div className="flex items-center w-full">
                <div>
                  <FaUser className="inline-block h-9 w-9 rounded-full text-gray-400" />
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium text-gray-700">{user?.full_name}</p>
                  <p className="text-xs font-medium text-gray-500">{user?.role}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="ml-3 text-gray-400 hover:text-gray-500"
                  title="Logout"
                >
                  <FaSignOutAlt className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        {/* Mobile header */}
        <div className="lg:hidden pl-1 pt-1 sm:pl-3 sm:pt-3">
          <button
            type="button"
            className="-ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="sr-only">Open sidebar</span>
            <FaBars className="h-6 w-6" />
          </button>
        </div>
        
        <main className="flex-1 relative z-0 overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default Layout;
