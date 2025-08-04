import React, { useState, useEffect } from 'react';
import axios from '../utils/axios';
import { useAuth } from '../contexts/AuthContext';

const Items = () => {
  const { currentUser } = useAuth();
  const [items, setItems] = useState([]);
  const [categories, setCategoriesWithCounts] = useState([]);
  const [categoryList, setCategoryList] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [showForm, setShowForm] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [newCategoryName, setNewCategoryName] = useState('');
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
  const canEdit = isAdmin || currentUser?.role === 'User';

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterItems();
  }, [searchTerm, selectedCategory, items]);

  const fetchData = async () => {
    try {
      const [itemsRes, categoriesRes, categoryListRes] = await Promise.all([
        axios.get('/api/items'),
        axios.get('/api/items/categories'),
        axios.get('/api/items/categories/list')
      ]);
      
      setItems(itemsRes.data);
      setCategoriesWithCounts(categoriesRes.data);
      setCategoryList(['All Categories', ...categoryListRes.data]);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  const filterItems = () => {
    let filtered = items;
    
    if (searchTerm) {
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (selectedCategory !== 'All Categories') {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }
    
    setFilteredItems(filtered);
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    
    try {
      await axios.post('/api/items/categories', { category_name: newCategoryName });
      setNewCategoryName('');
      fetchData();
      alert('Category created successfully');
    } catch (error) {
      alert('Error creating category: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleDeleteCategory = async (categoryId, categoryName) => {
    if (!window.confirm(`Delete category "${categoryName}"?`)) return;
    
    try {
      await axios.delete(`/api/items/categories/${categoryId}`);
      fetchData();
      alert('Category deleted successfully');
    } catch (error) {
      alert(error.response?.data?.message || 'Error deleting category');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await axios.put(`/api/items/${editingItem.item_id}`, formData);
      } else {
        await axios.post('/api/items', formData);
      }
      
      setShowForm(false);
      resetForm();
      fetchData();
    } catch (error) {
      alert('Error saving item: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleDelete = async (item) => {
    if (window.confirm(`Delete item: ${item.name}?`)) {
      try {
        await axios.delete(`/api/items/${item.item_id}`);
        fetchData();
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
      is_ada_friendly: item.is_ada_friendly,
      fluid_ml: item.fluid_ml || '',
      sodium_mg: item.sodium_mg || '',
      carbs_g: item.carbs_g || '',
      calories: item.calories || ''
    });
    setShowForm(true);
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

  if (loading) {
    return <div className="loading">Loading items...</div>;
  }

  return (
    <div className="items-page">
      <div className="page-header">
        <h1>Food Items</h1>
        <div className="header-actions">
          {isAdmin && (
            <button 
              className="btn btn-secondary"
              onClick={() => setShowCategoryManager(!showCategoryManager)}
            >
              Manage Categories
            </button>
          )}
          {canEdit && (
            <button 
              className="btn btn-primary"
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
            >
              Add New Item
            </button>
          )}
        </div>
      </div>

      {showCategoryManager && isAdmin && (
        <div className="category-manager">
          <h2>Category Management</h2>
          
          <div className="add-category-section">
            <h3>Add New Category</h3>
            <div className="category-form">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Enter category name"
                onKeyPress={(e) => e.key === 'Enter' && handleCreateCategory()}
              />
              <button onClick={handleCreateCategory} className="btn btn-primary">
                Add Category
              </button>
            </div>
          </div>

          <div className="existing-categories">
            <h3>Existing Categories</h3>
            <table className="categories-table">
              <thead>
                <tr>
                  <th>Category Name</th>
                  <th>Items Count</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.length === 0 ? (
                  <tr>
                    <td colSpan="3" style={{textAlign: 'center'}}>No categories found</td>
                  </tr>
                ) : (
                  categories.map(cat => (
                    <tr key={cat.category_id}>
                      <td>{cat.category_name}</td>
                      <td>{cat.item_count}</td>
                      <td>
                        <button 
                          onClick={() => handleDeleteCategory(cat.category_id, cat.category_name)}
                          className="btn btn-danger btn-small"
                          disabled={cat.item_count > 0}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
          {categoryList.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {showForm && (
        <div className="modal">
          <div className="modal-content">
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
                  {categoryList.filter(c => c !== 'All Categories').map(cat => (
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
                  <label>Fluid (ml)</label>
                  <input
                    type="number"
                    value={formData.fluid_ml}
                    onChange={(e) => setFormData({...formData, fluid_ml: e.target.value})}
                  />
                </div>
                
                <div className="form-group">
                  <label>Sodium (mg)</label>
                  <input
                    type="number"
                    value={formData.sodium_mg}
                    onChange={(e) => setFormData({...formData, sodium_mg: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Carbs (g)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.carbs_g}
                    onChange={(e) => setFormData({...formData, carbs_g: e.target.value})}
                  />
                </div>
                
                <div className="form-group">
                  <label>Calories</label>
                  <input
                    type="number"
                    value={formData.calories}
                    onChange={(e) => setFormData({...formData, calories: e.target.value})}
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

      <div className="items-grid">
        {filteredItems.map(item => (
          <div key={item.item_id} className="item-card">
            <h3>{item.name}</h3>
            <p className="category">{item.category}</p>
            {item.is_ada_friendly && <span className="ada-badge">ADA</span>}
            
            <div className="nutrition-info">
              {item.fluid_ml && <span>Fluid: {item.fluid_ml}ml</span>}
              {item.sodium_mg && <span>Sodium: {item.sodium_mg}mg</span>}
              {item.carbs_g && <span>Carbs: {item.carbs_g}g</span>}
              {item.calories && <span>Calories: {item.calories}</span>}
            </div>
            
            {canEdit && (
              <div className="item-actions">
                <button onClick={() => editItem(item)}>Edit</button>
                {isAdmin && (
                  <button onClick={() => handleDelete(item)} className="delete-btn">
                    Delete
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Items;
