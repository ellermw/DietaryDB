// /opt/dietarydb/admin-frontend/src/pages/Users.js
import React, { useState, useEffect, useContext } from 'react';
import axios from '../utils/axios';
import { useAuth } from '../contexts/AuthContext';

const Users = () => {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    full_name: '',
    role: 'User'
  });

  useEffect(() => {
    fetchUsers();
    // Refresh user list every 30 seconds to update online status
    const interval = setInterval(fetchUsers, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get('/api/users');
      setUsers(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching users:', error);
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await axios.put(`/api/users/${editingUser.user_id}`, {
          full_name: formData.full_name,
          role: formData.role,
          is_active: formData.is_active !== undefined ? formData.is_active : true
        });
      } else {
        await axios.post('/api/users', formData);
      }
      
      setShowForm(false);
      resetForm();
      fetchUsers();
    } catch (error) {
      alert('Error saving user: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleResetPassword = async (userId, username) => {
    if (window.confirm(`Reset password for user ${username}?`)) {
      try {
        const response = await axios.post(`/api/users/${userId}/reset-password`);
        alert(`Password reset successfully!\nUsername: ${response.data.username}\nTemporary password: ${response.data.temporaryPassword}`);
      } catch (error) {
        alert('Error resetting password');
      }
    }
  };

  const handleToggleActive = async (user) => {
    try {
      await axios.put(`/api/users/${user.user_id}`, { 
        is_active: !user.is_active 
      });
      fetchUsers();
    } catch (error) {
      alert('Error updating user');
    }
  };

  const handleDelete = async (userId, username) => {
    if (window.confirm(`Are you sure you want to deactivate user ${username}?`)) {
      try {
        await axios.delete(`/api/users/${userId}`);
        fetchUsers();
      } catch (error) {
        alert('Error deactivating user');
      }
    }
  };

  const editUser = (user) => {
    setFormData({
      username: user.username,
      full_name: user.full_name,
      role: user.role,
      is_active: user.is_active
    });
    setEditingUser(user);
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      username: '',
      password: '',
      full_name: '',
      role: 'User'
    });
    setEditingUser(null);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  const getLastLoginDisplay = (user) => {
    if (user.is_online) {
      return <span style={{ color: '#28a745', fontWeight: 'bold' }}>Active</span>;
    }
    return user.last_login ? formatDate(user.last_login) : 'Never';
  };

  if (loading) return <div>Loading...</div>;

  if (currentUser?.role !== 'Admin') {
    return (
      <div style={{ padding: '20px', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '4px' }}>
        <h2>Access Denied</h2>
        <p>You do not have permission to view this page. Admin access required.</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>User Management</h1>
        <button 
          onClick={() => { resetForm(); setShowForm(true); }}
          style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Add User
        </button>
      </div>

      {showForm && (
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h2>{editingUser ? 'Edit User' : 'Add New User'}</h2>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div>
                <label>Username {!editingUser && '*'}</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  required={!editingUser}
                  disabled={editingUser}
                  style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd', backgroundColor: editingUser ? '#e9ecef' : 'white' }}
                />
              </div>
              
              {!editingUser && (
                <div>
                  <label>Password *</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    required
                    minLength="6"
                    style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd' }}
                  />
                </div>
              )}
              
              <div>
                <label>Full Name *</label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                  required
                  style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd' }}
                />
              </div>
              
              <div>
                <label>Role *</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                  required
                  style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd' }}
                >
                  <option value="User">User</option>
                  <option value="Nurse">Nurse</option>
                  <option value="Kitchen">Kitchen</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>
            </div>
            
            <div style={{ marginTop: '20px' }}>
              <button type="submit" style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', marginRight: '10px' }}>
                {editingUser ? 'Update' : 'Create'} User
              </button>
              <button type="button" onClick={() => { setShowForm(false); resetForm(); }} style={{ padding: '10px 20px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px' }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div style={{ backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8f9fa' }}>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Username</th>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Full Name</th>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Role</th>
              <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #dee2e6' }}>Status</th>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Created</th>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Last Login</th>
              <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #dee2e6' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.user_id} style={{ borderBottom: '1px solid #dee2e6' }}>
                <td style={{ padding: '12px' }}>
                  {user.username}
                  {user.is_online && (
                    <span style={{ 
                      marginLeft: '8px',
                      display: 'inline-block',
                      width: '8px',
                      height: '8px',
                      backgroundColor: '#28a745',
                      borderRadius: '50%',
                      animation: 'pulse 2s infinite'
                    }} title="Online now" />
                  )}
                </td>
                <td style={{ padding: '12px' }}>{user.full_name}</td>
                <td style={{ padding: '12px' }}>
                  <span style={{ 
                    padding: '3px 8px', 
                    borderRadius: '3px', 
                    backgroundColor: user.role === 'Admin' ? '#dc3545' : user.role === 'Kitchen' ? '#28a745' : user.role === 'Nurse' ? '#17a2b8' : '#6c757d',
                    color: 'white',
                    fontSize: '0.875rem'
                  }}>
                    {user.role}
                  </span>
                </td>
                <td style={{ padding: '12px', textAlign: 'center' }}>
                  <span style={{ 
                    color: user.is_active ? '#28a745' : '#dc3545',
                    fontWeight: 'bold' 
                  }}>
                    {user.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td style={{ padding: '12px' }}>{formatDate(user.created_date)}</td>
                <td style={{ padding: '12px' }}>{getLastLoginDisplay(user)}</td>
                <td style={{ padding: '12px', textAlign: 'center' }}>
                  <button onClick={() => editUser(user)} style={{ marginRight: '5px', padding: '5px 10px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '0.875rem' }}>
                    Edit
                  </button>
                  <button onClick={() => handleResetPassword(user.user_id, user.username)} style={{ marginRight: '5px', padding: '5px 10px', backgroundColor: '#ffc107', color: '#212529', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '0.875rem' }}>
                    Reset Pwd
                  </button>
                  <button onClick={() => handleToggleActive(user)} style={{ padding: '5px 10px', backgroundColor: user.is_active ? '#dc3545' : '#28a745', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '0.875rem' }}>
                    {user.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <style jsx>{`
        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(40, 167, 69, 0.7);
          }
          70% {
            box-shadow: 0 0 0 6px rgba(40, 167, 69, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(40, 167, 69, 0);
          }
        }
      `}</style>
    </div>
  );
};

export default Users;