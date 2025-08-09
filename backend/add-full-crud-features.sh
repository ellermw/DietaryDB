#!/bin/bash
# /opt/dietarydb/add-full-crud-features.sh
# Add complete CRUD functionality and management features to all pages

set -e

echo "======================================"
echo "Adding Full CRUD and Management Features"
echo "======================================"

cd /opt/dietarydb

# Step 1: Create Items page with full CRUD and category management
echo ""
echo "Step 1: Creating Items page with full features..."
echo "================================================"

cat > admin-frontend/src/pages/Items.js << 'EOF'
import React, { useState, useEffect } from 'react';
import axios from '../utils/axios';
import './Items.css';

const Items = () => {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    calories: '',
    sodium_mg: '',
    carbs_g: '',
    fluid_ml: '',
    is_ada_friendly: false
  });
  const [newCategory, setNewCategory] = useState('');

  useEffect(() => {
    loadItems();
    loadCategories();
  }, []);

  const loadItems = async () => {
    try {
      const response = await axios.get('/api/items');
      setItems(response.data);
    } catch (error) {
      console.error('Error loading items:', error);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await axios.get('/api/items/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const handleAddItem = async () => {
    try {
      await axios.post('/api/items', formData);
      loadItems();
      setShowAddModal(false);
      resetForm();
    } catch (error) {
      alert('Error adding item');
    }
  };

  const handleEditItem = async () => {
    try {
      await axios.put(`/api/items/${editingItem.item_id}`, formData);
      loadItems();
      setShowEditModal(false);
      resetForm();
    } catch (error) {
      alert('Error updating item');
    }
  };

  const handleDeleteItem = async (id) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        await axios.delete(`/api/items/${id}`);
        loadItems();
      } catch (error) {
        alert('Error deleting item');
      }
    }
  };

  const handleAddCategory = async () => {
    try {
      await axios.post('/api/categories', { name: newCategory });
      loadCategories();
      setNewCategory('');
    } catch (error) {
      alert('Error adding category');
    }
  };

  const handleDeleteCategory = async (category) => {
    if (window.confirm(`Delete category "${category}"? Items in this category will not be deleted.`)) {
      try {
        await axios.delete(`/api/categories/${category}`);
        loadCategories();
      } catch (error) {
        alert('Error deleting category');
      }
    }
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      category: item.category,
      calories: item.calories || '',
      sodium_mg: item.sodium_mg || '',
      carbs_g: item.carbs_g || '',
      fluid_ml: item.fluid_ml || '',
      is_ada_friendly: item.is_ada_friendly || false
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: '',
      calories: '',
      sodium_mg: '',
      carbs_g: '',
      fluid_ml: '',
      is_ada_friendly: false
    });
    setEditingItem(null);
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="items-page">
      <div className="page-header">
        <h1>Food Items</h1>
        <div className="header-actions">
          <button onClick={() => setShowCategoryModal(true)} className="btn btn-secondary">
            Manage Categories
          </button>
          <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
            Add New Item
          </button>
        </div>
      </div>
      
      <div className="filters">
        <input
          type="text"
          placeholder="Search items..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        <select 
          value={selectedCategory} 
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="category-filter"
        >
          <option value="">All Categories</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      <div className="items-table">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Category</th>
              <th>Calories</th>
              <th>Sodium (mg)</th>
              <th>Carbs (g)</th>
              <th>Fluid (ml)</th>
              <th>ADA Friendly</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map(item => (
              <tr key={item.item_id}>
                <td>{item.name}</td>
                <td>{item.category}</td>
                <td>{item.calories || '-'}</td>
                <td>{item.sodium_mg || '-'}</td>
                <td>{item.carbs_g || '-'}</td>
                <td>{item.fluid_ml || '-'}</td>
                <td>{item.is_ada_friendly ? '✓' : '-'}</td>
                <td>
                  <button onClick={() => openEditModal(item)} className="btn-small btn-edit">Edit</button>
                  <button onClick={() => handleDeleteItem(item.item_id)} className="btn-small btn-delete">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Add New Item</h2>
            <div className="form-group">
              <label>Name*</label>
              <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Category*</label>
              <select value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})}>
                <option value="">Select Category</option>
                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Calories</label>
                <input type="number" value={formData.calories} onChange={(e) => setFormData({...formData, calories: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Sodium (mg)</label>
                <input type="number" value={formData.sodium_mg} onChange={(e) => setFormData({...formData, sodium_mg: e.target.value})} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Carbs (g)</label>
                <input type="number" value={formData.carbs_g} onChange={(e) => setFormData({...formData, carbs_g: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Fluid (ml)</label>
                <input type="number" value={formData.fluid_ml} onChange={(e) => setFormData({...formData, fluid_ml: e.target.value})} />
              </div>
            </div>
            <div className="form-group">
              <label>
                <input type="checkbox" checked={formData.is_ada_friendly} onChange={(e) => setFormData({...formData, is_ada_friendly: e.target.checked})} />
                ADA Friendly
              </label>
            </div>
            <div className="modal-actions">
              <button onClick={() => {setShowAddModal(false); resetForm()}} className="btn btn-secondary">Cancel</button>
              <button onClick={handleAddItem} className="btn btn-primary">Add Item</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Item Modal */}
      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Edit Item</h2>
            <div className="form-group">
              <label>Name*</label>
              <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Category*</label>
              <select value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})}>
                <option value="">Select Category</option>
                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Calories</label>
                <input type="number" value={formData.calories} onChange={(e) => setFormData({...formData, calories: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Sodium (mg)</label>
                <input type="number" value={formData.sodium_mg} onChange={(e) => setFormData({...formData, sodium_mg: e.target.value})} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Carbs (g)</label>
                <input type="number" value={formData.carbs_g} onChange={(e) => setFormData({...formData, carbs_g: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Fluid (ml)</label>
                <input type="number" value={formData.fluid_ml} onChange={(e) => setFormData({...formData, fluid_ml: e.target.value})} />
              </div>
            </div>
            <div className="form-group">
              <label>
                <input type="checkbox" checked={formData.is_ada_friendly} onChange={(e) => setFormData({...formData, is_ada_friendly: e.target.checked})} />
                ADA Friendly
              </label>
            </div>
            <div className="modal-actions">
              <button onClick={() => {setShowEditModal(false); resetForm()}} className="btn btn-secondary">Cancel</button>
              <button onClick={handleEditItem} className="btn btn-primary">Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* Category Management Modal */}
      {showCategoryModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Manage Categories</h2>
            <div className="category-add">
              <input 
                type="text" 
                placeholder="New category name" 
                value={newCategory} 
                onChange={(e) => setNewCategory(e.target.value)} 
              />
              <button onClick={handleAddCategory} className="btn btn-primary">Add Category</button>
            </div>
            <div className="category-list">
              {categories.map(cat => (
                <div key={cat} className="category-item">
                  <span>{cat}</span>
                  <button onClick={() => handleDeleteCategory(cat)} className="btn-small btn-delete">Delete</button>
                </div>
              ))}
            </div>
            <div className="modal-actions">
              <button onClick={() => setShowCategoryModal(false)} className="btn btn-secondary">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Items;
EOF

# Step 2: Create Users page with full CRUD
echo ""
echo "Step 2: Creating Users page with full features..."
echo "================================================"

cat > admin-frontend/src/pages/Users.js << 'EOF'
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
EOF

# Step 3: Create Tasks page with all features
echo ""
echo "Step 3: Creating Tasks page with complete features..."
echo "==================================================="

cat > admin-frontend/src/pages/Tasks.js << 'EOF'
import React, { useState, useEffect } from 'react';
import axios from '../utils/axios';
import './Tasks.css';

const Tasks = () => {
  const [dbStats, setDbStats] = useState(null);
  const [backups, setBackups] = useState([]);
  const [backupConfig, setBackupConfig] = useState({
    enabled: false,
    schedule: 'daily',
    time: '02:00',
    retention: 7
  });
  const [maintenanceConfig, setMaintenanceConfig] = useState({
    enabled: false,
    schedule: 'weekly',
    day: 'sunday',
    time: '03:00'
  });
  const [backupStatus, setBackupStatus] = useState('');
  const [maintenanceStatus, setMaintenanceStatus] = useState('');

  useEffect(() => {
    loadDatabaseStats();
    loadBackups();
    loadConfigurations();
  }, []);

  const loadDatabaseStats = async () => {
    try {
      const response = await axios.get('/api/tasks/database/stats');
      setDbStats(response.data);
    } catch (error) {
      console.error('Error loading database stats:', error);
    }
  };

  const loadBackups = async () => {
    try {
      const response = await axios.get('/api/tasks/backups');
      setBackups(response.data || []);
    } catch (error) {
      console.error('Error loading backups:', error);
    }
  };

  const loadConfigurations = async () => {
    try {
      const response = await axios.get('/api/tasks/config');
      if (response.data.backup) {
        setBackupConfig(response.data.backup);
      }
      if (response.data.maintenance) {
        setMaintenanceConfig(response.data.maintenance);
      }
    } catch (error) {
      console.error('Error loading configurations:', error);
    }
  };

  const createBackup = async () => {
    setBackupStatus('Creating backup...');
    try {
      const response = await axios.post('/api/tasks/backup');
      setBackupStatus(`Backup created: ${response.data.filename}`);
      loadBackups();
      setTimeout(() => setBackupStatus(''), 5000);
    } catch (error) {
      setBackupStatus('Backup failed: ' + error.message);
    }
  };

  const deleteBackup = async (filename) => {
    if (window.confirm(`Delete backup ${filename}?`)) {
      try {
        await axios.delete(`/api/tasks/backups/${filename}`);
        loadBackups();
      } catch (error) {
        alert('Error deleting backup');
      }
    }
  };

  const restoreBackup = async (filename) => {
    if (window.confirm(`Restore database from ${filename}? This will replace all current data!`)) {
      try {
        await axios.post(`/api/tasks/restore/${filename}`);
        alert('Database restored successfully');
      } catch (error) {
        alert('Error restoring backup');
      }
    }
  };

  const runMaintenance = async () => {
    setMaintenanceStatus('Running maintenance...');
    try {
      await axios.post('/api/tasks/maintenance');
      setMaintenanceStatus('Maintenance completed successfully');
      loadDatabaseStats();
      setTimeout(() => setMaintenanceStatus(''), 5000);
    } catch (error) {
      setMaintenanceStatus('Maintenance failed: ' + error.message);
    }
  };

  const saveBackupConfig = async () => {
    try {
      await axios.put('/api/tasks/config/backup', backupConfig);
      alert('Backup configuration saved');
    } catch (error) {
      alert('Error saving backup configuration');
    }
  };

  const saveMaintenanceConfig = async () => {
    try {
      await axios.put('/api/tasks/config/maintenance', maintenanceConfig);
      alert('Maintenance configuration saved');
    } catch (error) {
      alert('Error saving maintenance configuration');
    }
  };

  return (
    <div className="tasks-page">
      <h1>System Tasks</h1>
      
      {/* Database Statistics */}
      <div className="task-section">
        <h2>Database Statistics</h2>
        {dbStats ? (
          <div className="stats-grid">
            <div className="stat-item">
              <label>Database Size:</label>
              <span>{dbStats.database_size}</span>
            </div>
            <div className="stat-item">
              <label>Total Tables:</label>
              <span>{dbStats.table_count}</span>
            </div>
            <div className="stat-item">
              <label>Total Records:</label>
              <span>{dbStats.total_rows}</span>
            </div>
            <div className="stat-item">
              <label>Last Check:</label>
              <span>{new Date(dbStats.last_check).toLocaleString()}</span>
            </div>
          </div>
        ) : (
          <p>Loading statistics...</p>
        )}
        <button onClick={loadDatabaseStats} className="btn btn-secondary">Refresh Stats</button>
      </div>

      {/* Database Maintenance */}
      <div className="task-section">
        <h2>Database Maintenance</h2>
        <div className="maintenance-config">
          <h3>Schedule Maintenance</h3>
          <div className="config-grid">
            <div className="config-item">
              <label>
                <input 
                  type="checkbox" 
                  checked={maintenanceConfig.enabled}
                  onChange={(e) => setMaintenanceConfig({...maintenanceConfig, enabled: e.target.checked})}
                />
                Enable Scheduled Maintenance
              </label>
            </div>
            <div className="config-item">
              <label>Schedule:</label>
              <select 
                value={maintenanceConfig.schedule}
                onChange={(e) => setMaintenanceConfig({...maintenanceConfig, schedule: e.target.value})}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            {maintenanceConfig.schedule === 'weekly' && (
              <div className="config-item">
                <label>Day:</label>
                <select 
                  value={maintenanceConfig.day}
                  onChange={(e) => setMaintenanceConfig({...maintenanceConfig, day: e.target.value})}
                >
                  <option value="sunday">Sunday</option>
                  <option value="monday">Monday</option>
                  <option value="tuesday">Tuesday</option>
                  <option value="wednesday">Wednesday</option>
                  <option value="thursday">Thursday</option>
                  <option value="friday">Friday</option>
                  <option value="saturday">Saturday</option>
                </select>
              </div>
            )}
            <div className="config-item">
              <label>Time:</label>
              <input 
                type="time" 
                value={maintenanceConfig.time}
                onChange={(e) => setMaintenanceConfig({...maintenanceConfig, time: e.target.value})}
              />
            </div>
          </div>
          <div className="config-actions">
            <button onClick={saveMaintenanceConfig} className="btn btn-primary">Save Configuration</button>
            <button onClick={runMaintenance} className="btn btn-warning">Run Maintenance Now</button>
          </div>
          {maintenanceStatus && <p className="status-message">{maintenanceStatus}</p>}
        </div>
      </div>

      {/* Backup Management */}
      <div className="task-section">
        <h2>Backup Management</h2>
        
        <div className="backup-config">
          <h3>Backup Configuration</h3>
          <div className="config-grid">
            <div className="config-item">
              <label>
                <input 
                  type="checkbox" 
                  checked={backupConfig.enabled}
                  onChange={(e) => setBackupConfig({...backupConfig, enabled: e.target.checked})}
                />
                Enable Scheduled Backups
              </label>
            </div>
            <div className="config-item">
              <label>Schedule:</label>
              <select 
                value={backupConfig.schedule}
                onChange={(e) => setBackupConfig({...backupConfig, schedule: e.target.value})}
              >
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
            <div className="config-item">
              <label>Time:</label>
              <input 
                type="time" 
                value={backupConfig.time}
                onChange={(e) => setBackupConfig({...backupConfig, time: e.target.value})}
              />
            </div>
            <div className="config-item">
              <label>Retention (days):</label>
              <input 
                type="number" 
                value={backupConfig.retention}
                onChange={(e) => setBackupConfig({...backupConfig, retention: parseInt(e.target.value)})}
                min="1"
                max="365"
              />
            </div>
          </div>
          <div className="config-actions">
            <button onClick={saveBackupConfig} className="btn btn-primary">Save Configuration</button>
            <button onClick={createBackup} className="btn btn-success">Create Backup Now</button>
          </div>
          {backupStatus && <p className="status-message">{backupStatus}</p>}
        </div>

        <div className="backup-list">
          <h3>Existing Backups</h3>
          {backups.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>Filename</th>
                  <th>Date</th>
                  <th>Size</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {backups.map(backup => (
                  <tr key={backup.filename}>
                    <td>{backup.filename}</td>
                    <td>{new Date(backup.created).toLocaleString()}</td>
                    <td>{backup.size}</td>
                    <td>
                      <button onClick={() => restoreBackup(backup.filename)} className="btn-small btn-restore">Restore</button>
                      <button onClick={() => deleteBackup(backup.filename)} className="btn-small btn-delete">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No backups found</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Tasks;
EOF

# Step 4: Add CSS for modals and new features
echo ""
echo "Step 4: Adding CSS for all new features..."
echo "=========================================="

cat >> admin-frontend/src/pages/Items.css << 'EOF'

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.header-actions {
  display: flex;
  gap: 1rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.3s;
}

.btn-primary {
  background: #667eea;
  color: white;
}

.btn-primary:hover {
  background: #5a67d8;
}

.btn-secondary {
  background: #718096;
  color: white;
}

.btn-success {
  background: #48bb78;
  color: white;
}

.btn-warning {
  background: #f6ad55;
  color: white;
}

.btn-small {
  padding: 0.25rem 0.75rem;
  font-size: 0.875rem;
  margin: 0 0.25rem;
  border: none;
  border-radius: 3px;
  cursor: pointer;
}

.btn-edit {
  background: #4299e1;
  color: white;
}

.btn-delete {
  background: #f56565;
  color: white;
}

.btn-status {
  background: #ed8936;
  color: white;
}

.btn-restore {
  background: #48bb78;
  color: white;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal {
  background: white;
  padding: 2rem;
  border-radius: 10px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal h2 {
  margin-bottom: 1.5rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 5px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 2rem;
}

.category-add {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.category-list {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #eee;
  border-radius: 5px;
  padding: 1rem;
}

.category-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  border-bottom: 1px solid #eee;
}
EOF

cat >> admin-frontend/src/pages/Tasks.css << 'EOF'

.task-section {
  background: white;
  padding: 2rem;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  margin-bottom: 2rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin: 1.5rem 0;
}

.stat-item {
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 5px;
}

.stat-item label {
  font-weight: 600;
  color: #666;
}

.stat-item span {
  display: block;
  font-size: 1.5rem;
  color: #333;
  margin-top: 0.5rem;
}

.config-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
  margin: 1rem 0;
}

.config-item {
  padding: 0.75rem;
}

.config-item label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.config-item input[type="time"],
.config-item input[type="number"],
.config-item select {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 5px;
}

.config-actions {
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
}

.status-message {
  margin-top: 1rem;
  padding: 0.75rem;
  background: #e8f5e9;
  color: #2e7d32;
  border-radius: 5px;
}

.backup-list {
  margin-top: 2rem;
}

.backup-list table {
  width: 100%;
  margin-top: 1rem;
}

.maintenance-config,
.backup-config {
  border: 1px solid #eee;
  padding: 1.5rem;
  border-radius: 5px;
  margin-bottom: 1.5rem;
}
EOF

# Step 5: Rebuild frontend
echo ""
echo "Step 5: Rebuilding frontend with all features..."
echo "==============================================="

docker-compose build admin-frontend
docker-compose up -d admin-frontend

echo ""
echo "======================================"
echo "Full CRUD Features Added!"
echo "======================================"
echo ""
echo "✅ Items Page now has:"
echo "   - Add new item button"
echo "   - Edit/Delete buttons for each item"
echo "   - Category management (create, delete categories)"
echo ""
echo "✅ Users Page now has:"
echo "   - Add new user button"
echo "   - Edit/Delete/Deactivate buttons for each user"
echo "   - Role management"
echo ""
echo "✅ Tasks Page now has:"
echo "   - Complete database statistics (size, tables, records)"
echo "   - Schedule maintenance configuration"
echo "   - Run maintenance now button"
echo "   - Backup scheduling with retention policies"
echo "   - List of existing backups with restore/delete options"
echo ""
echo "Refresh your browser to see all the new features!"
echo ""
