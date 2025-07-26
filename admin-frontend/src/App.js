import React, { useState, useEffect } from 'react';

function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [stats, setStats] = useState({
    patients: { active: 0, ada: 0 },
    items: { total: 0, active: 0 },
    users: { total: 0, active: 0 }
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setLoggedIn(true);
      fetchStats();
    }
  }, []);

  const fetchStats = () => {
    // Simulated stats - in real app would fetch from API
    setStats({
      patients: { active: 3, ada: 1 },
      items: { total: 8, active: 8 },
      users: { total: 1, active: 1 }
    });
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (username === 'admin' && password === 'admin123') {
      setLoggedIn(true);
      localStorage.setItem('token', 'dummy-token');
      fetchStats();
    } else {
      alert('Invalid credentials');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setLoggedIn(false);
    setUsername('');
    setPassword('');
  };

  if (!loggedIn) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f5f5f5' }}>
        <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', width: '400px' }}>
          <h1 style={{ textAlign: 'center', marginBottom: '2rem' }}>Dietary Admin Login</h1>
          <form onSubmit={handleLogin}>
            <input
              type='text'
              placeholder='Username'
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem', border: '1px solid #ddd', borderRadius: '4px' }}
              required
            />
            <input
              type='password'
              placeholder='Password'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem', border: '1px solid #ddd', borderRadius: '4px' }}
              required
            />
            <button type='submit' style={{ width: '100%', padding: '0.5rem', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  const navigation = [
    { id: 'dashboard', name: 'Dashboard' },
    { id: 'items', name: 'Items / Categories' },
    { id: 'users', name: 'Users' },
    { id: 'backup', name: 'Backup / Restore' },
    { id: 'audit', name: 'Audit Logs' }
  ];

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return (
          <div>
            <h1>Dashboard</h1>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginTop: '2rem' }}>
              <div style={{ padding: '1.5rem', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                <h3>Active Patients</h3>
                <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.patients.active}</p>
                <p style={{ fontSize: '0.875rem', color: '#666' }}>ADA: {stats.patients.ada}</p>
              </div>
              <div style={{ padding: '1.5rem', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                <h3>Active Items</h3>
                <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.items.active}</p>
                <p style={{ fontSize: '0.875rem', color: '#666' }}>Total: {stats.items.total}</p>
              </div>
              <div style={{ padding: '1.5rem', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                <h3>Active Users</h3>
                <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.users.active}</p>
                <p style={{ fontSize: '0.875rem', color: '#666' }}>Total: {stats.users.total}</p>
              </div>
            </div>
          </div>
        );
      case 'items':
        return <div><h1>Items / Categories</h1><p>Manage food items and categories here.</p></div>;
      case 'users':
        return <div><h1>Users</h1><p>Manage system users here.</p></div>;
      case 'backup':
        return <div><h1>Backup / Restore</h1><p>Database backup and maintenance tools.</p></div>;
      case 'audit':
        return <div><h1>Audit Logs</h1><p>View system activity and logs.</p></div>;
      default:
        return <div><h1>Dashboard</h1></div>;
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <div style={{ width: '250px', backgroundColor: '#343a40', color: 'white', padding: '1rem' }}>
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
              {item.name}
            </div>
          ))}
        </nav>
        <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid #495057' }}>
          <button
            onClick={handleLogout}
            style={{ width: '100%', padding: '0.5rem', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Logout
          </button>
        </div>
      </div>
      <div style={{ flex: 1, padding: '2rem', backgroundColor: '#f8f9fa' }}>
        {renderPage()}
      </div>
    </div>
  );
}

export default App;
