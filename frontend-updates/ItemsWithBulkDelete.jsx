import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ItemsPage = () => {
  const [items, setItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [categories, setCategories] = useState([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchItems();
    fetchCategories();
  }, []);

  const fetchItems = async () => {
    try {
      const response = await axios.get('/api/items');
      setItems(response.data);
    } catch (error) {
      console.error('Error fetching items:', error);
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

  const handleSelectItem = (itemId) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
    setSelectAll(newSelected.size === items.length);
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(items.map(item => item.item_id)));
    }
    setSelectAll(!selectAll);
  };

  const handleBulkDelete = async () => {
    if (selectedItems.size === 0) {
      alert('No items selected');
      return;
    }

    if (!confirm(`Delete ${selectedItems.size} selected items?`)) {
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('/api/items/bulk-delete', {
        item_ids: Array.from(selectedItems)
      });
      alert(response.data.message);
      setSelectedItems(new Set());
      setSelectAll(false);
      fetchItems();
    } catch (error) {
      alert('Error deleting items: ' + error.response?.data?.message);
    }
    setLoading(false);
  };

  const handleAddCategory = async () => {
    if (!newCategory.trim()) {
      alert('Category name is required');
      return;
    }

    try {
      await axios.post('/api/categories', {
        category_name: newCategory.trim()
      });
      alert('Category added successfully');
      setNewCategory('');
      fetchCategories();
    } catch (error) {
      alert('Error adding category: ' + error.response?.data?.message);
    }
  };

  const handleDeleteCategory = async (categoryId, categoryName, itemCount) => {
    if (itemCount > 0) {
      alert(`Cannot delete category "${categoryName}" with ${itemCount} items`);
      return;
    }

    if (!confirm(`Delete category "${categoryName}"?`)) {
      return;
    }

    try {
      await axios.delete(`/api/categories/${categoryId}`);
      alert('Category deleted successfully');
      fetchCategories();
    } catch (error) {
      alert('Error deleting category: ' + error.response?.data?.message);
    }
  };

  return (
    <div className="items-page">
      <div className="items-header">
        <h1>Food Items</h1>
        <div className="header-actions">
          <button 
            onClick={() => setShowCategoryModal(true)}
            className="btn btn-secondary"
          >
            Manage Categories
          </button>
          {selectedItems.size > 0 && (
            <button 
              onClick={handleBulkDelete}
              className="btn btn-danger"
              disabled={loading}
            >
              Delete Selected ({selectedItems.size})
            </button>
          )}
        </div>
      </div>

      <div className="items-controls">
        <label>
          <input 
            type="checkbox" 
            checked={selectAll}
            onChange={handleSelectAll}
          />
          Select All
        </label>
      </div>

      <table className="items-table">
        <thead>
          <tr>
            <th>
              <input 
                type="checkbox" 
                checked={selectAll}
                onChange={handleSelectAll}
              />
            </th>
            <th>Name</th>
            <th>Category</th>
            <th>Calories</th>
            <th>Sodium</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <tr key={item.item_id}>
              <td>
                <input 
                  type="checkbox"
                  checked={selectedItems.has(item.item_id)}
                  onChange={() => handleSelectItem(item.item_id)}
                />
              </td>
              <td>{item.name}</td>
              <td>{item.category}</td>
              <td>{item.calories}</td>
              <td>{item.sodium_mg}</td>
              <td>
                <button className="btn btn-sm btn-primary">Edit</button>
                <button className="btn btn-sm btn-danger">Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Category Management Modal */}
      {showCategoryModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Manage Categories</h2>
            
            <div className="add-category-form">
              <input 
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="New category name"
              />
              <button onClick={handleAddCategory}>Add Category</button>
            </div>

            <div className="categories-list">
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
                    <tr key={cat.category_id}>
                      <td>{cat.category_name}</td>
                      <td>{cat.item_count}</td>
                      <td>
                        <button 
                          onClick={() => handleDeleteCategory(cat.category_id, cat.category_name, cat.item_count)}
                          disabled={cat.item_count > 0}
                          className="btn btn-sm btn-danger"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button onClick={() => setShowCategoryModal(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ItemsPage;
