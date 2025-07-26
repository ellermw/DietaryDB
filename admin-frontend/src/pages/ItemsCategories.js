import React, { useState, useEffect } from 'react';

function ItemsCategories() {
  const [activeTab, setActiveTab] = useState('items');
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [showItemForm, setShowItemForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch items
      const itemsRes = await fetch('http://localhost:3000/api/items', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const itemsData = await itemsRes.json();
      setItems(itemsData.items || []);

      // Fetch categories
      const categoriesRes = await fetch('http://localhost:3000/api/categories', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const categoriesData = await categoriesRes.json();
      setCategories(categoriesData.categories || []);

      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  const handleSaveItem = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      name: formData.get('name'),
      category: formData.get('category'),
      description: formData.get('description'),
      is_ada_friendly: formData.get('is_ada_friendly') === 'on',
      is_active: formData.get('is_active') === 'on'
    };

    try {
      const token = localStorage.getItem('token');
      const url = editingItem 
        ? `http://localhost:3000/api/items/${editingItem.item_id}`
        : 'http://localhost:3000/api/items';
      
      const response = await fetch(url, {
        method: editingItem ? 'PUT' : 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        await fetchData();
        setShowItemForm(false);
        setEditingItem(null);
      }
    } catch (error) {
      console.error('Error saving item:', error);
    }
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      category_name: formData.get('category_name'),
      description: formData.get('description'),
      sort_order: parseInt(formData.get('sort_order')) || 0
    };

    try {
      const token = localStorage.getItem('token');
      const url = editingCategory 
        ? `http://localhost:3000/api/categories/${editingCategory.category_id}`
        : 'http://localhost:3000/api/categories';
      
      const response = await fetch(url, {
        method: editingCategory ? 'PUT' : 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        await fetchData();
        setShowCategoryForm(false);
        setEditingCategory(null);
      }
    } catch (error) {
      console.error('Error saving category:', error);
    }
  };

  const handleDeleteItem = async (id) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3000/api/items/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        await fetchData();
      }
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3000/api/categories/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        await fetchData();
      }
    } catch (error) {
      console.error('Error deleting category:', error);
    }
  };

  const ItemForm = () => (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '2rem',
        width: '90%',
        maxWidth: '500px',
        maxHeight: '90vh',
        overflow: 'auto'
      }}>
        <h2 style={{ marginTop: 0 }}>{editingItem ? 'Edit Item' : 'Add New Item'}</h2>
        <form onSubmit={handleSaveItem}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Name *
            </label>
            <input
              type="text"
              name="name"
              defaultValue={editingItem?.name}
              required
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '1rem'
              }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Category *
            </label>
            <select
              name="category"
              defaultValue={editingItem?.category}
              required
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '1rem'
              }}
            >
              <option value="">Select a category</option>
              {categories.map(cat => (
                <option key={cat.category_id} value={cat.category_name}>
                  {cat.category_name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Description
            </label>
            <textarea
              name="description"
              defaultValue={editingItem?.description}
              rows="3"
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '1rem'
              }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                name="is_ada_friendly"
                defaultChecked={editingItem?.is_ada_friendly}
              />
              ADA Friendly
            </label>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                name="is_active"
                defaultChecked={editingItem?.is_active !== false}
              />
              Active
            </label>
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => {
                setShowItemForm(false);
                setEditingItem(null);
              }}
              style={{
                padding: '0.5rem 1rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                backgroundColor: 'white',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                padding: '0.5rem 1rem',
                border: 'none',
                borderRadius: '4px',
                backgroundColor: '#3498db',
                color: 'white',
                cursor: 'pointer'
              }}
            >
              {editingItem ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  const CategoryForm = () => (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '2rem',
        width: '90%',
        maxWidth: '500px'
      }}>
        <h2 style={{ marginTop: 0 }}>{editingCategory ? 'Edit Category' : 'Add New Category'}</h2>
        <form onSubmit={handleSaveCategory}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Category Name *
            </label>
            <input
              type="text"
              name="category_name"
              defaultValue={editingCategory?.category_name}
              required
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '1rem'
              }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Description
            </label>
            <textarea
              name="description"
              defaultValue={editingCategory?.description}
              rows="3"
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '1rem'
              }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Sort Order
            </label>
            <input
              type="number"
              name="sort_order"
              defaultValue={editingCategory?.sort_order || 0}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '1rem'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => {
                setShowCategoryForm(false);
                setEditingCategory(null);
              }}
              style={{
                padding: '0.5rem 1rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                backgroundColor: 'white',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                padding: '0.5rem 1rem',
                border: 'none',
                borderRadius: '4px',
                backgroundColor: '#3498db',
                color: 'white',
                cursor: 'pointer'
              }}
            >
              {editingCategory ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>Loading...</h2>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ margin: '0 0 0.5rem 0', color: '#2c3e50' }}>Items & Categories</h1>
        <p style={{ margin: 0, color: '#7f8c8d' }}>
          Manage food items and categories in the system
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <button
          onClick={() => setActiveTab('items')}
          style={{
            padding: '0.75rem 1.5rem',
            border: 'none',
            borderRadius: '4px',
            backgroundColor: activeTab === 'items' ? '#3498db' : '#ecf0f1',
            color: activeTab === 'items' ? 'white' : '#2c3e50',
            cursor: 'pointer',
            fontWeight: '500'
          }}
        >
          Items ({items.length})
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          style={{
            padding: '0.75rem 1.5rem',
            border: 'none',
            borderRadius: '4px',
            backgroundColor: activeTab === 'categories' ? '#3498db' : '#ecf0f1',
            color: activeTab === 'categories' ? 'white' : '#2c3e50',
            cursor: 'pointer',
            fontWeight: '500'
          }}
        >
          Categories ({categories.length})
        </button>
      </div>

      {activeTab === 'items' && (
        <div>
          <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setShowItemForm(true)}
              style={{
                padding: '0.75rem 1.5rem',
                border: 'none',
                borderRadius: '4px',
                backgroundColor: '#2ecc71',
                color: 'white',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              + Add New Item
            </button>
          </div>

          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            overflow: 'hidden'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Name</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Category</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Description</th>
                  <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '600' }}>ADA</th>
                  <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '600' }}>Status</th>
                  <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '600' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.item_id} style={{ borderBottom: '1px solid #e0e0e0' }}>
                    <td style={{ padding: '1rem' }}>{item.name}</td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{
                        backgroundColor: '#e3f2fd',
                        color: '#1976d2',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.875rem'
                      }}>
                        {item.category}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', color: '#666' }}>
                      {item.description || '-'}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      {item.is_ada_friendly ? '✓' : '-'}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <span style={{
                        backgroundColor: item.is_active ? '#e8f5e9' : '#ffebee',
                        color: item.is_active ? '#388e3c' : '#d32f2f',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.875rem'
                      }}>
                        {item.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <button
                        onClick={() => {
                          setEditingItem(item);
                          setShowItemForm(true);
                        }}
                        style={{
                          padding: '0.25rem 0.5rem',
                          marginRight: '0.5rem',
                          border: '1px solid #3498db',
                          borderRadius: '4px',
                          backgroundColor: 'white',
                          color: '#3498db',
                          cursor: 'pointer',
                          fontSize: '0.875rem'
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.item_id)}
                        style={{
                          padding: '0.25rem 0.5rem',
                          border: '1px solid #e74c3c',
                          borderRadius: '4px',
                          backgroundColor: 'white',
                          color: '#e74c3c',
                          cursor: 'pointer',
                          fontSize: '0.875rem'
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'categories' && (
        <div>
          <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setShowCategoryForm(true)}
              style={{
                padding: '0.75rem 1.5rem',
                border: 'none',
                borderRadius: '4px',
                backgroundColor: '#2ecc71',
                color: 'white',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              + Add New Category
            </button>
          </div>

          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            overflow: 'hidden'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Category Name</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Description</th>
                  <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '600' }}>Sort Order</th>
                  <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '600' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => (
                  <tr key={category.category_id} style={{ borderBottom: '1px solid #e0e0e0' }}>
                    <td style={{ padding: '1rem', fontWeight: '500' }}>{category.category_name}</td>
                    <td style={{ padding: '1rem', color: '#666' }}>
                      {category.description || '-'}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      {category.sort_order}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <button
                        onClick={() => {
                          setEditingCategory(category);
                          setShowCategoryForm(true);
                        }}
                        style={{
                          padding: '0.25rem 0.5rem',
                          marginRight: '0.5rem',
                          border: '1px solid #3498db',
                          borderRadius: '4px',
                          backgroundColor: 'white',
                          color: '#3498db',
                          cursor: 'pointer',
                          fontSize: '0.875rem'
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(category.category_id)}
                        style={{
                          padding: '0.25rem 0.5rem',
                          border: '1px solid #e74c3c',
                          borderRadius: '4px',
                          backgroundColor: 'white',
                          color: '#e74c3c',
                          cursor: 'pointer',
                          fontSize: '0.875rem'
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showItemForm && <ItemForm />}
      {showCategoryForm && <CategoryForm />}
    </div>
  );
}

export default ItemsCategories;