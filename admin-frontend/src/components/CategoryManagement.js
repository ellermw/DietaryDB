import React, { useState } from 'react';
import axios from '../utils/axios';

const CategoryManagement = ({ categories = [], onClose, onRefresh }) => {
  const [newCategory, setNewCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCategory.trim()) return;
    
    setLoading(true);
    setError('');
    
    try {
      await axios.post('/api/items/categories', {
        category_name: newCategory.trim()
      });
      
      setNewCategory('');
      if (onRefresh) onRefresh();
    } catch (error) {
      setError(error.response?.data?.message || 'Error adding category');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (categoryName) => {
    if (!window.confirm(`Delete category "${categoryName}"?`)) return;
    
    try {
      await axios.delete(`/api/items/categories/${encodeURIComponent(categoryName)}`);
      if (onRefresh) onRefresh();
    } catch (error) {
      alert(error.response?.data?.message || 'Error deleting category');
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content category-management">
        <h2>Manage Categories</h2>
        
        <form onSubmit={handleAddCategory} className="add-category-form">
          <input
            type="text"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="Enter new category name"
            disabled={loading}
          />
          <button type="submit" disabled={loading || !newCategory.trim()}>
            Add Category
          </button>
        </form>
        
        {error && <div className="error-message">{error}</div>}
        
        <div className="category-list">
          <h3>Existing Categories</h3>
          {categories.length === 0 ? (
            <p>No categories found</p>
          ) : (
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
                  <tr key={cat.category_name}>
                    <td>{cat.category_name}</td>
                    <td>{cat.item_count || 0}</td>
                    <td>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDeleteCategory(cat.category_name)}
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
          )}
        </div>
        
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default CategoryManagement;
