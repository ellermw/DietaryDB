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
  const [showCategoryModal, setShowCategoryModal] = useState(false);
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
      const response = await axios.get('/api/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCategory.trim()) return;
    
    try {
      await axios.post('/api/categories', {
        category_name: newCategory.trim()
      });
      
      alert(`Category "${newCategory}" created successfully!`);
      setNewCategory('');
      fetchCategories();
    } catch (error) {
      alert('Error adding category: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleDeleteCategory = async (category) => {
    if (category.item_count > 0) {
      alert(`Cannot delete category "${category.category_name}" because it contains ${category.item_count} items.`);
      return;
    }
    
    if (window.confirm(`Delete category "${category.category_name}"?`)) {
      try {
        await axios.delete(`/api/categories/${category.category_id}`);
        fetchCategories();
      } catch (error) {
        alert('Error deleting category: ' + (error.response?.data?.message || error.message));
      }
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
        fetchCategories();
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

  const uniqueCategories = [...new Set(categories.map(cat => cat.category_name).filter(Boolean))];

  if (loading) return <div className="loading">Loading items...</div>;

  return (
    <div className="items-page">
      <div className="items-header">
        <h1>Food Items</h1>
        <div className="header-actions">
          {isAdmin && (
            <>
              <button 
                className="btn btn-secondary"
                onClick={() => setShowCategoryModal(true)}
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
          {uniqueCategories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      <div className="items-grid">
        {filteredItems.map(item => (
          <div key={item.item_id} className="item-card">
            <h3>{item.name}</h3>
            <p className="category">{item.category}</p>
            {item.is_ada_friendly && (
              <span className="ada-badge">ADA Friendly</span>
            )}
            <div className="nutritional-info">
              {item.calories !== null && <span>Calories: {item.calories}</span>}
              {item.carbs_g !== null && <span>Carbs: {item.carbs_g}g</span>}
              {item.sodium_mg !== null && <span>Sodium: {item.sodium_mg}mg</span>}
              {item.fluid_ml !== null && <span>Fluid: {item.fluid_ml}ml</span>}
            </div>
            {isAdmin && (
              <div className="item-actions">
                <button onClick={() => editItem(item)} className="btn btn-sm btn-info">
                  Edit
                </button>
                <button 
                  onClick={() => handleDelete(item)} 
                  className="btn btn-sm btn-danger"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {showItemForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>{editingItem ? 'Edit Item' : 'Add New Item'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Item Name*</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label>Category*</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  required
                >
                  <option value="">Select a category</option>
                  {uniqueCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="form-group checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.is_ada_friendly}
                    onChange={(e) => setFormData({...formData, is_ada_friendly: e.target.checked})}
                  />
                  ADA Friendly
                </label>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Calories</label>
                  <input
                    type="number"
                    value={formData.calories}
                    onChange={(e) => setFormData({...formData, calories: e.target.value})}
                    min="0"
                  />
                </div>

                <div className="form-group">
                  <label>Carbs (g)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.carbs_g}
                    onChange={(e) => setFormData({...formData, carbs_g: e.target.value})}
                    min="0"
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
                    min="0"
                  />
                </div>

                <div className="form-group">
                  <label>Fluid (ml)</label>
                  <input
                    type="number"
                    value={formData.fluid_ml}
                    onChange={(e) => setFormData({...formData, fluid_ml: e.target.value})}
                    min="0"
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn btn-primary">
                  {editingItem ? 'Update' : 'Create'}
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowItemForm(false);
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

      {showCategoryModal && (
        <div className="modal-overlay">
          <div className="modal-content category-management">
            <h2>Manage Categories</h2>
            
            <form onSubmit={handleAddCategory} className="add-category-form">
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="Enter new category name"
              />
              <button type="submit" disabled={!newCategory.trim()}>
                Add Category
              </button>
            </form>
            
            <div className="category-list">
              <h3>Existing Categories</h3>
              <table>
                <thead>
                  <tr>
                    <th>Category Name</th>
                    <th>Item Count</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map(cat => (
                    <tr key={cat.category_id || cat.category_name}>
                      <td>{cat.category_name}</td>
                      <td>{cat.item_count || 0}</td>
                      <td>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDeleteCategory(cat)}
                          disabled={cat.item_count > 0}
                          title={cat.item_count > 0 ? 'Cannot delete category with items' : 'Delete category'}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowCategoryModal(false)}>
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
