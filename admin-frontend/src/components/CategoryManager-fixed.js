import React, { useState, useEffect } from 'react';
import axios from '../utils/axios';

const CategoryManager = ({ onClose, onCategoryAdded }) => {
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      // First get basic categories
      const basicResponse = await axios.get('/api/items/categories');
      
      // Then get detailed info with counts
      const detailedResponse = await axios.get('/api/categories/detailed');
      console.log('Categories with counts:', detailedResponse.data);
      
      // Merge the data
      const categoriesWithCounts = basicResponse.data.map(cat => {
        const detailed = detailedResponse.data.find(d => d.name === cat);
        return {
          name: cat,
          item_count: detailed ? detailed.item_count : 0
        };
      });
      
      setCategories(categoriesWithCounts);
    } catch (error) {
      console.error('Error fetching categories:', error);
      // Fallback to basic categories
      try {
        const response = await axios.get('/api/items/categories');
        setCategories(response.data.map(cat => ({ name: cat, item_count: 0 })));
      } catch (err) {
        console.error('Error fetching basic categories:', err);
      }
    }
  };

  const addCategory = async () => {
    if (!newCategory.trim()) {
      alert('Please enter a category name');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('/api/categories', { 
        name: newCategory.trim() 
      });
      console.log('Add category response:', response.data);
      
      alert(response.data.message || 'Category added successfully');
      setNewCategory('');
      fetchCategories();
      
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
      const response = await axios.delete(`/api/categories/${encodeURIComponent(categoryName)}`);
      console.log('Delete response:', response.data);
      
      alert(response.data.message || 'Category deleted');
      fetchCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      alert(error.response?.data?.message || 'Error deleting category');
    }
  };

  return (
    <div className="category-manager">
      <h2>Manage Categories</h2>
      
      <div className="add-category">
        <input
          type="text"
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          placeholder="New category name"
          onKeyPress={(e) => e.key === 'Enter' && addCategory()}
        />
        <button onClick={addCategory} disabled={loading}>
          {loading ? 'Adding...' : 'Add Category'}
        </button>
      </div>

      <div className="categories-list">
        {categories.map((cat) => (
          <div key={cat.name} className="category-item">
            <span className="category-name">{cat.name}</span>
            <span className="item-count">({cat.item_count} items)</span>
            <button 
              onClick={() => deleteCategory(cat.name)}
              disabled={cat.item_count > 0}
              title={cat.item_count > 0 ? 'Cannot delete - has items' : 'Delete category'}
            >
              Delete
            </button>
          </div>
        ))}
      </div>

      <button onClick={onClose}>Close</button>
    </div>
  );
};

export default CategoryManager;
