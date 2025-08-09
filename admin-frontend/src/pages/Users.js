import React, { useState, useEffect } from 'react';
import axios from '../utils/axios';
import './Users.css';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    first_name: '',
    last_name: '',
    role: 'User',
    is_active: true
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await axios.get('/api/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const handleAddUser = async () => {
    try {
      await axios.post('/api/users', formData);
      loadUsers();
      setShowAddModal(false);
      resetForm();
    } catch (error) {
      alert('Error adding user');
    }
  };

  const handleEditUser = async () => {
    try {
      const updateData = {...formData};
      if (!updateData.password) {
        delete updateData.password; // Don't update password if empty
      }
      await axios.put(`/api/users/${editingUser.user_id}`, updateData);
      loadUsers();
      setShowEditModal(false);
      resetForm();
    } catch (error) {
      alert('Error updating user');
    }
  };

  const handleDeleteUser = async (id, username) => {
    if (username === 'admin') {
      alert('Cannot delete the admin user');
      return;
    }
    
    if (window.confirm(`Are you sure you want to delete user "${username}"?`)) {
      try {
        await axios.delete(`/api/users/${id}`);
        loadUsers();
      } catch (error) {
        alert('Error deleting user');
      }
    }
  };

  const toggleUserStatus = async (user) => {
    try {
      await axios.put(`/api/users/${user.user_id}`, {
        ...user,
        is_active: !user.is_active
      });
      loadUsers();
    } catch (error) {
      alert('Error updating user status');
    }
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: '', // Don't show existing password
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      is_active: user.is_active
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      username: '',
      password: '',
      first_name: '',
      last_name: '',
      role: 'User',
      is_active: true
    });
    setEditingUser(null);
  };

  return (
    <div className="users-page">
      <div className="page-header">
        <h1>User Management</h1>
        <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
          Add New User
        </button>
      </div>
      
      <div className="users-table">
        <table>
          <thead>
            <tr>
              <th>Username</th>
              <th>Name</th>
              <th>Role</th>
              <th>Status</th>
              <th>Last Login</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.user_id}>
                <td>{user.username}</td>
                <td>{user.first_name} {user.last_name}</td>
                <td><span className={`role ${user.role.toLowerCase()}`}>{user.role}</span></td>
                <td>
                  <span className={`status ${user.is_active ? 'active' : 'inactive'}`}>
                    {user.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>{user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}</td>
                <td>
                  <button onClick={() => openEditModal(user)} className="btn-small btn-edit">Edit</button>
                  <button onClick={() => toggleUserStatus(user)} className="btn-small btn-status">
                    {user.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  {user.username !== 'admin' && (
                    <button onClick={() => handleDeleteUser(user.user_id, user.username)} className="btn-small btn-delete">Delete</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Add New User</h2>
            <div className="form-group">
              <label>Username*</label>
              <input type="text" value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Password*</label>
              <input type="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>First Name*</label>
                <input type="text" value={formData.first_name} onChange={(e) => setFormData({...formData, first_name: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Last Name*</label>
                <input type="text" value={formData.last_name} onChange={(e) => setFormData({...formData, last_name: e.target.value})} />
              </div>
            </div>
            <div className="form-group">
              <label>Role</label>
              <select value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})}>
                <option value="User">User</option>
                <option value="Admin">Admin</option>
              </select>
            </div>
            <div className="form-group">
              <label>
                <input type="checkbox" checked={formData.is_active} onChange={(e) => setFormData({...formData, is_active: e.target.checked})} />
                Active
              </label>
            </div>
            <div className="modal-actions">
              <button onClick={() => {setShowAddModal(false); resetForm()}} className="btn btn-secondary">Cancel</button>
              <button onClick={handleAddUser} className="btn btn-primary">Add User</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Edit User</h2>
            <div className="form-group">
              <label>Username</label>
              <input type="text" value={formData.username} disabled />
            </div>
            <div className="form-group">
              <label>Password (leave blank to keep current)</label>
              <input type="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>First Name*</label>
                <input type="text" value={formData.first_name} onChange={(e) => setFormData({...formData, first_name: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Last Name*</label>
                <input type="text" value={formData.last_name} onChange={(e) => setFormData({...formData, last_name: e.target.value})} />
              </div>
            </div>
            <div className="form-group">
              <label>Role</label>
              <select value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})}>
                <option value="User">User</option>
                <option value="Admin">Admin</option>
              </select>
            </div>
            <div className="form-group">
              <label>
                <input type="checkbox" checked={formData.is_active} onChange={(e) => setFormData({...formData, is_active: e.target.checked})} />
                Active
              </label>
            </div>
            <div className="modal-actions">
              <button onClick={() => {setShowEditModal(false); resetForm()}} className="btn btn-secondary">Cancel</button>
              <button onClick={handleEditUser} className="btn btn-primary">Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
