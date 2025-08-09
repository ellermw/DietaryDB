import React, { useState, useEffect } from 'react';
import axios from '../utils/axios';
import './CategoryManager.css';

const CategoryManager = ({ isOpen, onClose, onCategoryAdded }) => {
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      
      // Get detailed categories with item counts
      const response = await axios.get('/api/categories/detailed');
      console.log('Categories with counts:', response.data);
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
      
      // Fallback to basic categories
      try {
        const basicResponse = await axios.get('/api/items/categories');
        setCategories(basicResponse.data.map(name => ({ name, item_count: 0 })));
      } catch (err) {
        console.error('Error fetching basic categories:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  const addCategory = async () => {
    const categoryName = newCategory.trim();
    
    if (!categoryName) {
      alert('Please enter a category name');
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post('/api/categories', { 
        name: categoryName 
      });
      
      console.log('Add category response:', response.data);
      alert(response.data.message || 'Category added successfully');
      
      setNewCategory('');
      await fetchCategories();
      
      if (onCategoryAdded) {
        onCategoryAdded();
      }
    } catch (error) {
      console.error('Error adding category:', error);
      alert(error.response?.data?.message || 'Error adding category');
    } finally {
      setLoading(false);
    }
  };

  const deleteCategory = async (categoryName) => {
    if (!window.confirm(`Delete category "${categoryName}"?`)) {
      return;
    }

    try {
      setLoading(true);
      const response = await axios.delete(`/api/categories/${encodeURIComponent(categoryName)}`);
      
      console.log('Delete response:', response.data);
      alert(response.data.message || 'Category deleted successfully');
      
      await fetchCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      alert(error.response?.data?.message || 'Error deleting category');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Manage Categories</h2>
        
        <div className="add-category-section">
          <input
            type="text"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="New category name"
            onKeyPress={(e) => e.key === 'Enter' && addCategory()}
            disabled={loading}
          />
          <button 
            onClick={addCategory} 
            disabled={loading || !newCategory.trim()}
            className="btn btn-success"
          >
            Add Category
          </button>
        </div>

        <div className="categories-list">
          <h3>Current Categories</h3>
          {loading ? (
            <p>Loading...</p>
          ) : (
            categories.map((category) => (
              <div key={category.name} className="category-item">
                <span className="category-name">{category.name}</span>
                <span className="item-count">({category.item_count} items)</span>
                <button 
                  onClick={() => deleteCategory(category.name)}
                  disabled={category.item_count > 0}
                  className={`btn ${category.item_count > 0 ? 'btn-disabled' : 'btn-danger'}`}
                  title={category.item_count > 0 ? 'Cannot delete - has items' : 'Delete category'}
                >
                  Delete
                </button>
              </div>
            ))
          )}
        </div>

        <button onClick={onClose} className="btn btn-secondary">
          Close
        </button>
      </div>
    </div>
  );
};

export default CategoryManager;
