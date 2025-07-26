import React, { useState, useEffect } from 'react';

function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [showUserForm, setShowUserForm] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3000/api/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setUsers(data.users || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching users:', error);
      setLoading(false);
    }
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      username: formData.get('username'),
      full_name: formData.get('full_name'),
      role: formData.get('role'),
      is_active: formData.get('is_active') === 'on'
    };

    if (!editingUser) {
      data.password = formData.get('password');
    }

    try {
      const token = localStorage.getItem('token');
      const url = editingUser 
        ? `http://localhost:3000/api/users/${editingUser.user_id}`
        : 'http://localhost:3000/api/users';
      
      const response = await fetch(url, {
        method: editingUser ? 'PUT' : 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        await fetchUsers();
        setShowUserForm(false);
        setEditingUser(null);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to save user');
      }
    } catch (error) {
      console.error('Error saving user:', error);
      alert('Failed to save user');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const password = formData.get('password');
    const confirmPassword = formData.get('confirmPassword');

    if (password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3000/api/users/${selectedUser.user_id}/password`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ password })
      });

      if (response.ok) {
        setShowPasswordForm(false);
        setSelectedUser(null);
        alert('Password updated successfully');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      alert('Failed to change password');
    }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3000/api/users/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        await fetchUsers();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user');
    }
  };

  const formatDate = (date) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleString();
  };

  const UserForm = () => (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '2rem',
        width: '90%',
        maxWidth: '500px',
        maxHeight: '90vh',
        overflow: 'auto'
      }}>
        <h2 style={{ marginTop: 0 }}>{editingUser ? 'Edit User' : 'Add New User'}</h2>
        <form onSubmit={handleSaveUser}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Username *
            </label>
            <input
              type="text"
              name="username"
              defaultValue={editingUser?.username}
              required
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '1rem'
              }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Full Name *
            </label>
            <input
              type="text"
              name="full_name"
              defaultValue={editingUser?.full_name}
              required
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '1rem'
              }}
            />
          </div>

          {!editingUser && (
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Password *
              </label>
              <input
                type="password"
                name="password"
                required
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '1rem'
                }}
              />
            </div>
          )}

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Role *
            </label>
            <select
              name="role"
              defaultValue={editingUser?.role || 'User'}
              required
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '1rem'
              }}
            >
              <option value="Admin">Admin</option>
              <option value="User">User</option>
              <option value="Kitchen">Kitchen</option>
              <option value="Nurse">Nurse</option>
            </select>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                name="is_active"
                defaultChecked={editingUser?.is_active !== false}
              />
              Active
            </label>
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => {
                setShowUserForm(false);
                setEditingUser(null);
              }}
              style={{
                padding: '0.5rem 1rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                backgroundColor: 'white',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                padding: '0.5rem 1rem',
                border: 'none',
                borderRadius: '4px',
                backgroundColor: '#3498db',
                color: 'white',
                cursor: 'pointer'
              }}
            >
              {editingUser ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  const PasswordForm = () => (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '2rem',
        width: '90%',
        maxWidth: '400px'
      }}>
        <h2 style={{ marginTop: 0 }}>Change Password</h2>
        <p style={{ color: '#666', marginBottom: '1.5rem' }}>
          Changing password for: <strong>{selectedUser?.full_name}</strong>
        </p>
        <form onSubmit={handleChangePassword}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              New Password *
            </label>
            <input
              type="password"
              name="password"
              required
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '1rem'
              }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Confirm Password *
            </label>
            <input
              type="password"
              name="confirmPassword"
              required
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '1rem'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => {
                setShowPasswordForm(false);
                setSelectedUser(null);
              }}
              style={{
                padding: '0.5rem 1rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                backgroundColor: 'white',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                padding: '0.5rem 1rem',
                border: 'none',
                borderRadius: '4px',
                backgroundColor: '#3498db',
                color: 'white',
                cursor: 'pointer'
              }}
            >
              Change Password
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>Loading...</h2>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ margin: '0 0 0.5rem 0', color: '#2c3e50' }}>User Management</h1>
        <p style={{ margin: 0, color: '#7f8c8d' }}>
          Manage system users and their permissions
        </p>
      </div>

      <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <span style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#e3f2fd',
            borderRadius: '4px',
            fontSize: '0.875rem'
          }}>
            Total Users: <strong>{users.length}</strong>
          </span>
          <span style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#e8f5e9',
            borderRadius: '4px',
            fontSize: '0.875rem'
          }}>
            Active: <strong>{users.filter(u => u.is_active).length}</strong>
          </span>
        </div>
        <button
          onClick={() => setShowUserForm(true)}
          style={{
            padding: '0.75rem 1.5rem',
            border: 'none',
            borderRadius: '4px',
            backgroundColor: '#2ecc71',
            color: 'white',
            cursor: 'pointer',
            fontWeight: '500'
          }}
        >
          + Add New User
        </button>
      </div>

      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        overflow: 'hidden'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8f9fa' }}>
              <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Username</th>
              <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Full Name</th>
              <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Role</th>
              <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '600' }}>Status</th>
              <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Last Login</th>
              <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '600' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const roleColors = {
                'Admin': { bg: '#fee', color: '#c00' },
                'User': { bg: '#e3f2fd', color: '#1976d2' },
                'Kitchen': { bg: '#fff3e0', color: '#f57c00' },
                'Nurse': { bg: '#f3e5f5', color: '#7b1fa2' }
              };
              const roleStyle = roleColors[user.role] || roleColors['User'];

              return (
                <tr key={user.user_id} style={{ borderBottom: '1px solid #e0e0e0' }}>
                  <td style={{ padding: '1rem' }}>{user.username}</td>
                  <td style={{ padding: '1rem', fontWeight: '500' }}>{user.full_name}</td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{
                      backgroundColor: roleStyle.bg,
                      color: roleStyle.color,
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.875rem',
                      fontWeight: '500'
                    }}>
                      {user.role}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <span style={{
                      backgroundColor: user.is_active ? '#e8f5e9' : '#ffebee',
                      color: user.is_active ? '#388e3c' : '#d32f2f',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.875rem'
                    }}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#666' }}>
                    {formatDate(user.last_login)}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <button
                      onClick={() => {
                        setEditingUser(user);
                        setShowUserForm(true);
                      }}
                      style={{
                        padding: '0.25rem 0.5rem',
                        marginRight: '0.25rem',
                        border: '1px solid #3498db',
                        borderRadius: '4px',
                        backgroundColor: 'white',
                        color: '#3498db',
                        cursor: 'pointer',
                        fontSize: '0.875rem'
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        setSelectedUser(user);
                        setShowPasswordForm(true);
                      }}
                      style={{
                        padding: '0.25rem 0.5rem',
                        marginRight: '0.25rem',
                        border: '1px solid #f39c12',
                        borderRadius: '4px',
                        backgroundColor: 'white',
                        color: '#f39c12',
                        cursor: 'pointer',
                        fontSize: '0.875rem'
                      }}
                    >
                      Password
                    </button>
                    <button
                      onClick={() => handleDeleteUser(user.user_id)}
                      style={{
                        padding: '0.25rem 0.5rem',
                        border: '1px solid #e74c3c',
                        borderRadius: '4px',
                        backgroundColor: 'white',
                        color: '#e74c3c',
                        cursor: 'pointer',
                        fontSize: '0.875rem'
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showUserForm && <UserForm />}
      {showPasswordForm && <PasswordForm />}
    </div>
  );
}

export default Users;