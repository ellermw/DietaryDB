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
