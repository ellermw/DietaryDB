import React, { useState } from 'react';

function Login({ onLogin }) {
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });

      const data = await response.json();

      if (response.ok) {
        onLogin(data.token, data.user);
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (error) {
      setError('Connection error. Please check if the server is running.');
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
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ margin: '0 0 0.5rem 0', color: '#2c3e50' }}>
            Dietary Admin
          </h1>
          <p style={{ margin: 0, color: '#7f8c8d' }}>
            Sign in to access the admin panel
          </p>
        </div>

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
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '1rem',
                transition: 'border-color 0.2s',
                outline: 'none'
              }}
              onFocus={(e) => e.target.style.borderColor = '#3498db'}
              onBlur={(e) => e.target.style.borderColor = '#ddd'}
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
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '1rem',
                transition: 'border-color 0.2s',
                outline: 'none'
              }}
              onFocus={(e) => e.target.style.borderColor = '#3498db'}
              onBlur={(e) => e.target.style.borderColor = '#ddd'}
            />
          </div>

          {error && (
            <div style={{
              backgroundColor: '#fee',
              border: '1px solid #fcc',
              color: '#c00',
              padding: '0.75rem',
              borderRadius: '4px',
              marginBottom: '1.5rem',
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
              border: 'none',
              borderRadius: '4px',
              backgroundColor: loading ? '#95a5a6' : '#3498db',
              color: 'white',
              fontSize: '1rem',
              fontWeight: '500',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => !loading && (e.target.style.backgroundColor = '#2980b9')}
            onMouseLeave={(e) => !loading && (e.target.style.backgroundColor = '#3498db')}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={{
          marginTop: '2rem',
          paddingTop: '2rem',
          borderTop: '1px solid #eee',
          textAlign: 'center',
          color: '#7f8c8d',
          fontSize: '0.875rem'
        }}>
          <p style={{ margin: '0 0 0.5rem 0' }}>
            Default credentials:
          </p>
          <code style={{
            backgroundColor: '#f8f9fa',
            padding: '0.25rem 0.5rem',
            borderRadius: '4px',
            fontFamily: 'monospace'
          }}>
            admin / admin123
          </code>
          <p style={{ margin: '1rem 0 0 0', fontSize: '0.75rem' }}>
            Remember to change the default password after first login
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;