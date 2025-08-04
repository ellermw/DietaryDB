import React, { useState, useEffect } from 'react';
import axios from '../utils/axios';
import { useAuth } from '../contexts/AuthContext';
import './Items.css';

const Items = () => {
  const { currentUser } = useAuth();
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showItemForm, setShowItemForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showManageCategories, setShowManageCategories] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    is_ada_friendly: false,
    fluid_ml: '',
    sodium_mg: '',
    carbs_g: '',
    calories: ''
  });

  const isAdmin = currentUser?.role === 'Admin';

  useEffect(() => {
    fetchItems();
    fetchCategories();
  }, []);

  const fetchItems = async () => {
    try {
      const response = await axios.get('/api/items');
      setItems(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching items:', error);
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get('/api/items/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;
    
    try {
      // For now, just add to local state
      // The category will be created when first item is added
      if (!categories.includes(newCategory)) {
        setCategories([...categories, newCategory]);
      }
      setNewCategory('');
      alert('Category added successfully!');
    } catch (error) {
      alert('Error adding category: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const dataToSend = {
        ...formData,
        fluid_ml: formData.fluid_ml ? parseInt(formData.fluid_ml) : null,
        sodium_mg: formData.sodium_mg ? parseInt(formData.sodium_mg) : null,
        carbs_g: formData.carbs_g ? parseFloat(formData.carbs_g) : null,
        calories: formData.calories ? parseInt(formData.calories) : null
      };

      if (editingItem) {
        await axios.put(`/api/items/${editingItem.item_id}`, dataToSend);
      } else {
        await axios.post('/api/items', dataToSend);
      }
      
      setShowItemForm(false);
      resetForm();
      fetchItems();
      fetchCategories();
    } catch (error) {
      alert('Error saving item: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleDelete = async (item) => {
    if (window.confirm(`Are you sure you want to delete "${item.name}"?`)) {
      try {
        await axios.delete(`/api/items/${item.item_id}`);
        fetchItems();
      } catch (error) {
        alert('Error deleting item');
      }
    }
  };

  const editItem = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      category: item.category,
      is_ada_friendly: item.is_ada_friendly || false,
      fluid_ml: item.fluid_ml || '',
      sodium_mg: item.sodium_mg || '',
      carbs_g: item.carbs_g || '',
      calories: item.calories || ''
    });
    setShowItemForm(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: '',
      is_ada_friendly: false,
      fluid_ml: '',
      sodium_mg: '',
      carbs_g: '',
      calories: ''
    });
    setEditingItem(null);
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categoryCounts = categories.reduce((acc, cat) => {
    acc[cat] = items.filter(item => item.category === cat).length;
    return acc;
  }, {});

  if (loading) {
    return <div className="loading">Loading items...</div>;
  }

  return (
    <div className="items-page">
      <div className="items-header">
        <h1>Food Items</h1>
        <div className="header-actions">
          {isAdmin && (
            <>
              <button 
                className="btn btn-secondary"
                onClick={() => setShowManageCategories(true)}
              >
                Manage Categories
              </button>
              <button 
                className="btn btn-primary"
                onClick={() => {
                  resetForm();
                  setShowItemForm(true);
                }}
              >
                Add New Item
              </button>
            </>
          )}
        </div>
      </div>

      <div className="items-filters">
        <input
          type="text"
          placeholder="Search items..."
          className="search-box"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select 
          className="category-filter"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          <option value="">All Categories</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {filteredItems.length === 0 ? (
        <div className="no-items">
          <p>No items found.</p>
          {isAdmin && (
            <button 
              className="btn btn-primary"
              onClick={() => {
                resetForm();
                setShowItemForm(true);
              }}
            >
              Add First Item
            </button>
          )}
        </div>
      ) : (
        <div className="items-grid">
          {filteredItems.map(item => (
            <div key={item.item_id} className="item-card">
              <div className="item-header">
                <h3 className="item-name">{item.name}</h3>
                <span className="item-category">{item.category}</span>
              </div>
              
              {item.is_ada_friendly && (
                <div className="ada-badge">ADA Friendly</div>
              )}
              
              <div className="item-details">
                {item.calories && (
                  <div className="detail-item">
                    Calories: <span>{item.calories}</span>
                  </div>
                )}
                {item.carbs_g && (
                  <div className="detail-item">
                    Carbs: <span>{item.carbs_g}g</span>
                  </div>
                )}
                {item.sodium_mg && (
                  <div className="detail-item">
                    Sodium: <span>{item.sodium_mg}mg</span>
                  </div>
                )}
                {item.fluid_ml && (
                  <div className="detail-item">
                    Fluid: <span>{item.fluid_ml}ml</span>
                  </div>
                )}
              </div>
              
              {isAdmin && (
                <div className="item-actions">
                  <button 
                    className="btn btn-sm btn-primary"
                    onClick={() => editItem(item)}
                  >
                    Edit
                  </button>
                  <button 
                    className="btn btn-sm btn-danger"
                    onClick={() => handleDelete(item)}
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Item Form Modal */}
      {showItemForm && (
        <div className="modal-overlay" onClick={() => setShowItemForm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>{editingItem ? 'Edit Item' : 'Add New Item'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label>Category *</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  required
                >
                  <option value="">Select Category</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.is_ada_friendly}
                    onChange={(e) => setFormData({...formData, is_ada_friendly: e.target.checked})}
                  />
                  <span>ADA Friendly</span>
                </label>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Calories</label>
                  <input
                    type="number"
                    value={formData.calories}
                    onChange={(e) => setFormData({...formData, calories: e.target.value})}
                  />
                </div>

                <div className="form-group">
                  <label>Carbs (g)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.carbs_g}
                    onChange={(e) => setFormData({...formData, carbs_g: e.target.value})}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Sodium (mg)</label>
                  <input
                    type="number"
                    value={formData.sodium_mg}
                    onChange={(e) => setFormData({...formData, sodium_mg: e.target.value})}
                  />
                </div>

                <div className="form-group">
                  <label>Fluid (ml)</label>
                  <input
                    type="number"
                    value={formData.fluid_ml}
                    onChange={(e) => setFormData({...formData, fluid_ml: e.target.value})}
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn btn-primary">
                  {editingItem ? 'Update' : 'Create'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowItemForm(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Categories Modal */}
      {showManageCategories && (
        <div className="modal-overlay" onClick={() => setShowManageCategories(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>Category Management</h2>
            
            <div className="category-form">
              <h3>Add New Category</h3>
              <div className="form-row">
                <input
                  type="text"
                  placeholder="Category name"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                />
                <button 
                  className="btn btn-primary"
                  onClick={handleAddCategory}
                >
                  Add Category
                </button>
              </div>
            </div>

            <div className="categories-list">
              <h3>Existing Categories</h3>
              <table>
                <thead>
                  <tr>
                    <th>CATEGORY NAME</th>
                    <th>ITEMS COUNT</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.length === 0 ? (
                    <tr>
                      <td colSpan="2" style={{ textAlign: 'center' }}>
                        No categories found
                      </td>
                    </tr>
                  ) : (
                    categories.map(cat => (
                      <tr key={cat}>
                        <td>{cat}</td>
                        <td>{categoryCounts[cat] || 0}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="form-actions">
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowManageCategories(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Items;
