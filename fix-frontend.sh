#!/bin/bash

echo "Fixing frontend files..."

# Create a working React index.js
echo "import React from 'react';" > admin-frontend/src/index.js
echo "import ReactDOM from 'react-dom/client';" >> admin-frontend/src/index.js
echo "import App from './App';" >> admin-frontend/src/index.js
echo "" >> admin-frontend/src/index.js
echo "const root = ReactDOM.createRoot(document.getElementById('root'));" >> admin-frontend/src/index.js
echo "root.render(<App />);" >> admin-frontend/src/index.js

# Create a working React App.js
echo "import React, { useState, useEffect } from 'react';" > admin-frontend/src/App.js
echo "" >> admin-frontend/src/App.js
echo "function App() {" >> admin-frontend/src/App.js
echo "  const [loggedIn, setLoggedIn] = useState(false);" >> admin-frontend/src/App.js
echo "  const [username, setUsername] = useState('');" >> admin-frontend/src/App.js
echo "  const [password, setPassword] = useState('');" >> admin-frontend/src/App.js
echo "  const [currentPage, setCurrentPage] = useState('dashboard');" >> admin-frontend/src/App.js
echo "  const [stats, setStats] = useState({" >> admin-frontend/src/App.js
echo "    patients: { active: 0, ada: 0 }," >> admin-frontend/src/App.js
echo "    items: { total: 0, active: 0 }," >> admin-frontend/src/App.js
echo "    users: { total: 0, active: 0 }" >> admin-frontend/src/App.js
echo "  });" >> admin-frontend/src/App.js
echo "" >> admin-frontend/src/App.js
echo "  useEffect(() => {" >> admin-frontend/src/App.js
echo "    const token = localStorage.getItem('token');" >> admin-frontend/src/App.js
echo "    if (token) {" >> admin-frontend/src/App.js
echo "      setLoggedIn(true);" >> admin-frontend/src/App.js
echo "      fetchStats();" >> admin-frontend/src/App.js
echo "    }" >> admin-frontend/src/App.js
echo "  }, []);" >> admin-frontend/src/App.js
echo "" >> admin-frontend/src/App.js
echo "  const fetchStats = () => {" >> admin-frontend/src/App.js
echo "    // Simulated stats - in real app would fetch from API" >> admin-frontend/src/App.js
echo "    setStats({" >> admin-frontend/src/App.js
echo "      patients: { active: 3, ada: 1 }," >> admin-frontend/src/App.js
echo "      items: { total: 8, active: 8 }," >> admin-frontend/src/App.js
echo "      users: { total: 1, active: 1 }" >> admin-frontend/src/App.js
echo "    });" >> admin-frontend/src/App.js
echo "  };" >> admin-frontend/src/App.js
echo "" >> admin-frontend/src/App.js
echo "  const handleLogin = (e) => {" >> admin-frontend/src/App.js
echo "    e.preventDefault();" >> admin-frontend/src/App.js
echo "    if (username === 'admin' && password === 'admin123') {" >> admin-frontend/src/App.js
echo "      setLoggedIn(true);" >> admin-frontend/src/App.js
echo "      localStorage.setItem('token', 'dummy-token');" >> admin-frontend/src/App.js
echo "      fetchStats();" >> admin-frontend/src/App.js
echo "    } else {" >> admin-frontend/src/App.js
echo "      alert('Invalid credentials');" >> admin-frontend/src/App.js
echo "    }" >> admin-frontend/src/App.js
echo "  };" >> admin-frontend/src/App.js
echo "" >> admin-frontend/src/App.js
echo "  const handleLogout = () => {" >> admin-frontend/src/App.js
echo "    localStorage.removeItem('token');" >> admin-frontend/src/App.js
echo "    setLoggedIn(false);" >> admin-frontend/src/App.js
echo "    setUsername('');" >> admin-frontend/src/App.js
echo "    setPassword('');" >> admin-frontend/src/App.js
echo "  };" >> admin-frontend/src/App.js
echo "" >> admin-frontend/src/App.js
echo "  if (!loggedIn) {" >> admin-frontend/src/App.js
echo "    return (" >> admin-frontend/src/App.js
echo "      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f5f5f5' }}>" >> admin-frontend/src/App.js
echo "        <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', width: '400px' }}>" >> admin-frontend/src/App.js
echo "          <h1 style={{ textAlign: 'center', marginBottom: '2rem' }}>Dietary Admin Login</h1>" >> admin-frontend/src/App.js
echo "          <form onSubmit={handleLogin}>" >> admin-frontend/src/App.js
echo "            <input" >> admin-frontend/src/App.js
echo "              type='text'" >> admin-frontend/src/App.js
echo "              placeholder='Username'" >> admin-frontend/src/App.js
echo "              value={username}" >> admin-frontend/src/App.js
echo "              onChange={(e) => setUsername(e.target.value)}" >> admin-frontend/src/App.js
echo "              style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem', border: '1px solid #ddd', borderRadius: '4px' }}" >> admin-frontend/src/App.js
echo "              required" >> admin-frontend/src/App.js
echo "            />" >> admin-frontend/src/App.js
echo "            <input" >> admin-frontend/src/App.js
echo "              type='password'" >> admin-frontend/src/App.js
echo "              placeholder='Password'" >> admin-frontend/src/App.js
echo "              value={password}" >> admin-frontend/src/App.js
echo "              onChange={(e) => setPassword(e.target.value)}" >> admin-frontend/src/App.js
echo "              style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem', border: '1px solid #ddd', borderRadius: '4px' }}" >> admin-frontend/src/App.js
echo "              required" >> admin-frontend/src/App.js
echo "            />" >> admin-frontend/src/App.js
echo "            <button type='submit' style={{ width: '100%', padding: '0.5rem', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>" >> admin-frontend/src/App.js
echo "              Login" >> admin-frontend/src/App.js
echo "            </button>" >> admin-frontend/src/App.js
echo "          </form>" >> admin-frontend/src/App.js
echo "        </div>" >> admin-frontend/src/App.js
echo "      </div>" >> admin-frontend/src/App.js
echo "    );" >> admin-frontend/src/App.js
echo "  }" >> admin-frontend/src/App.js
echo "" >> admin-frontend/src/App.js
echo "  const navigation = [" >> admin-frontend/src/App.js
echo "    { id: 'dashboard', name: 'Dashboard' }," >> admin-frontend/src/App.js
echo "    { id: 'items', name: 'Items / Categories' }," >> admin-frontend/src/App.js
echo "    { id: 'users', name: 'Users' }," >> admin-frontend/src/App.js
echo "    { id: 'backup', name: 'Backup / Restore' }," >> admin-frontend/src/App.js
echo "    { id: 'audit', name: 'Audit Logs' }" >> admin-frontend/src/App.js
echo "  ];" >> admin-frontend/src/App.js
echo "" >> admin-frontend/src/App.js
echo "  const renderPage = () => {" >> admin-frontend/src/App.js
echo "    switch (currentPage) {" >> admin-frontend/src/App.js
echo "      case 'dashboard':" >> admin-frontend/src/App.js
echo "        return (" >> admin-frontend/src/App.js
echo "          <div>" >> admin-frontend/src/App.js
echo "            <h1>Dashboard</h1>" >> admin-frontend/src/App.js
echo "            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginTop: '2rem' }}>" >> admin-frontend/src/App.js
echo "              <div style={{ padding: '1.5rem', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>" >> admin-frontend/src/App.js
echo "                <h3>Active Patients</h3>" >> admin-frontend/src/App.js
echo "                <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.patients.active}</p>" >> admin-frontend/src/App.js
echo "                <p style={{ fontSize: '0.875rem', color: '#666' }}>ADA: {stats.patients.ada}</p>" >> admin-frontend/src/App.js
echo "              </div>" >> admin-frontend/src/App.js
echo "              <div style={{ padding: '1.5rem', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>" >> admin-frontend/src/App.js
echo "                <h3>Active Items</h3>" >> admin-frontend/src/App.js
echo "                <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.items.active}</p>" >> admin-frontend/src/App.js
echo "                <p style={{ fontSize: '0.875rem', color: '#666' }}>Total: {stats.items.total}</p>" >> admin-frontend/src/App.js
echo "              </div>" >> admin-frontend/src/App.js
echo "              <div style={{ padding: '1.5rem', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>" >> admin-frontend/src/App.js
echo "                <h3>Active Users</h3>" >> admin-frontend/src/App.js
echo "                <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.users.active}</p>" >> admin-frontend/src/App.js
echo "                <p style={{ fontSize: '0.875rem', color: '#666' }}>Total: {stats.users.total}</p>" >> admin-frontend/src/App.js
echo "              </div>" >> admin-frontend/src/App.js
echo "            </div>" >> admin-frontend/src/App.js
echo "          </div>" >> admin-frontend/src/App.js
echo "        );" >> admin-frontend/src/App.js
echo "      case 'items':" >> admin-frontend/src/App.js
echo "        return <div><h1>Items / Categories</h1><p>Manage food items and categories here.</p></div>;" >> admin-frontend/src/App.js
echo "      case 'users':" >> admin-frontend/src/App.js
echo "        return <div><h1>Users</h1><p>Manage system users here.</p></div>;" >> admin-frontend/src/App.js
echo "      case 'backup':" >> admin-frontend/src/App.js
echo "        return <div><h1>Backup / Restore</h1><p>Database backup and maintenance tools.</p></div>;" >> admin-frontend/src/App.js
echo "      case 'audit':" >> admin-frontend/src/App.js
echo "        return <div><h1>Audit Logs</h1><p>View system activity and logs.</p></div>;" >> admin-frontend/src/App.js
echo "      default:" >> admin-frontend/src/App.js
echo "        return <div><h1>Dashboard</h1></div>;" >> admin-frontend/src/App.js
echo "    }" >> admin-frontend/src/App.js
echo "  };" >> admin-frontend/src/App.js
echo "" >> admin-frontend/src/App.js
echo "  return (" >> admin-frontend/src/App.js
echo "    <div style={{ display: 'flex', minHeight: '100vh' }}>" >> admin-frontend/src/App.js
echo "      <div style={{ width: '250px', backgroundColor: '#343a40', color: 'white', padding: '1rem' }}>" >> admin-frontend/src/App.js
echo "        <h2 style={{ marginBottom: '2rem' }}>Dietary Admin</h2>" >> admin-frontend/src/App.js
echo "        <nav>" >> admin-frontend/src/App.js
echo "          {navigation.map(item => (" >> admin-frontend/src/App.js
echo "            <div" >> admin-frontend/src/App.js
echo "              key={item.id}" >> admin-frontend/src/App.js
echo "              onClick={() => setCurrentPage(item.id)}" >> admin-frontend/src/App.js
echo "              style={{" >> admin-frontend/src/App.js
echo "                padding: '0.75rem'," >> admin-frontend/src/App.js
echo "                marginBottom: '0.5rem'," >> admin-frontend/src/App.js
echo "                backgroundColor: currentPage === item.id ? '#495057' : 'transparent'," >> admin-frontend/src/App.js
echo "                borderRadius: '4px'," >> admin-frontend/src/App.js
echo "                cursor: 'pointer'" >> admin-frontend/src/App.js
echo "              }}" >> admin-frontend/src/App.js
echo "            >" >> admin-frontend/src/App.js
echo "              {item.name}" >> admin-frontend/src/App.js
echo "            </div>" >> admin-frontend/src/App.js
echo "          ))}" >> admin-frontend/src/App.js
echo "        </nav>" >> admin-frontend/src/App.js
echo "        <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid #495057' }}>" >> admin-frontend/src/App.js
echo "          <button" >> admin-frontend/src/App.js
echo "            onClick={handleLogout}" >> admin-frontend/src/App.js
echo "            style={{ width: '100%', padding: '0.5rem', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}" >> admin-frontend/src/App.js
echo "          >" >> admin-frontend/src/App.js
echo "            Logout" >> admin-frontend/src/App.js
echo "          </button>" >> admin-frontend/src/App.js
echo "        </div>" >> admin-frontend/src/App.js
echo "      </div>" >> admin-frontend/src/App.js
echo "      <div style={{ flex: 1, padding: '2rem', backgroundColor: '#f8f9fa' }}>" >> admin-frontend/src/App.js
echo "        {renderPage()}" >> admin-frontend/src/App.js
echo "      </div>" >> admin-frontend/src/App.js
echo "    </div>" >> admin-frontend/src/App.js
echo "  );" >> admin-frontend/src/App.js
echo "}" >> admin-frontend/src/App.js
echo "" >> admin-frontend/src/App.js
echo "export default App;" >> admin-frontend/src/App.js

echo "Frontend files fixed. Rebuilding..."
docker-compose build admin
docker-compose up -d

echo "Fix complete!"
