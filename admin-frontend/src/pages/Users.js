import React, { useState, useEffect } from 'react';
import axios from '../utils/axios';
import { useAuth } from '../contexts/AuthContext';
import './Users.css';

const Users = () => {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    first_name: '',
    last_name: '',
    role: 'User'
  });

  const isAdmin = currentUser?.role === 'Admin';

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setError(null);
      const response = await axios.get('/api/users');
      setUsers(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching users:', error);
      setError(error.response?.data?.message || 'Failed to load users');
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await axios.put(`/api/users/${editingUser.user_id}`, formData);
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

  const handleDelete = async (user) => {
    if (user.username === 'admin') {
      alert('Cannot delete the system admin user');
      return;
    }
    
    if (window.confirm(`Are you sure you want to permanently delete user "${user.username}"?`)) {
      try {
        await axios.delete(`/api/users/${user.user_id}`);
        alert('User deleted successfully');
        fetchUsers();
      } catch (error) {
        alert('Error deleting user: ' + (error.response?.data?.message || error.message));
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
      alert('Error updating user status');
    }
  };

  const editUser = (user) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: '',
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      role: user.role
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      username: '',
      password: '',
      first_name: '',
      last_name: '',
      role: 'User'
    });
    setEditingUser(null);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  if (loading) return <div className="loading">Loading users...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="users-page">
      <div className="page-header">
        <h1>User Management</h1>
        {isAdmin && (
          <button
            className="btn btn-primary"
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
          >
            Add New User
          </button>
        )}
      </div>

      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>First Name</th>
              <th>Last Name</th>
              <th>Role</th>
              <th>Status</th>
              <th>Created</th>
              {isAdmin && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.user_id}>
                <td>{user.username}</td>
                <td>{user.first_name}</td>
                <td>{user.last_name}</td>
                <td>
                  <span className={`role-badge role-${user.role.toLowerCase()}`}>
                    {user.role}
                  </span>
                </td>
                <td>
                  <span className={`status-badge ${user.is_active ? 'active' : 'inactive'}`}>
                    {user.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>{formatDate(user.created_date)}</td>
                {isAdmin && (
                  <td>
                    <div className="action-buttons">
                      <button
                        className="btn btn-sm btn-info"
                        onClick={() => editUser(user)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-sm btn-warning"
                        onClick={() => handleToggleActive(user)}
                      >
                        {user.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      {user.username !== 'admin' && (
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDelete(user)}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>{editingUser ? 'Edit User' : 'Add New User'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Username*</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  required
                  disabled={editingUser}
                />
              </div>

              <div className="form-group">
                <label>Password{editingUser ? ' (leave blank to keep current)' : '*'}</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  required={!editingUser}
                />
              </div>

              <div className="form-group">
                <label>First Name*</label>
                <input
                  type="text"
                  value={formData.first_name}
                  onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label>Last Name*</label>
                <input
                  type="text"
                  value={formData.last_name}
                  onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label>Role*</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                  required
                >
                  <option value="User">User</option>
                  <option value="Admin">Admin</option>
                  <option value="Kitchen">Kitchen</option>
                  <option value="Dietary">Dietary</option>
                </select>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn btn-primary">
                  {editingUser ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
