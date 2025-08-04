import React, { useState, useEffect } from 'react';
import axios from '../utils/axios';
import { useAuth } from '../contexts/AuthContext';

const Items = () => {
  const { currentUser } = useAuth();
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    description: '',
    is_ada_friendly: false,
    fluid_ml: '',
    carbs_g: '',
    sodium_mg: '',
    calories: ''
  });

  const canEdit = currentUser?.role === 'Admin' || currentUser?.role === 'Kitchen';
  const canDelete = currentUser?.role === 'Admin';

  useEffect(() => {
    fetchItems();
  }, []);

  useEffect(() => {
    filterItems();
  }, [searchTerm, selectedCategory, items]);

  const fetchItems = async () => {
    try {
      const response = await axios.get('/api/items');
      setItems(response.data);
      
      const uniqueCategories = [...new Set(response.data.map(item => item.category))];
      setCategories(['All Categories', ...uniqueCategories]);
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching items:', error);
      setLoading(false);
    }
  };

  const filterItems = () => {
    let filtered = items;
    
    if (searchTerm) {
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (selectedCategory !== 'All Categories') {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }
    
    setFilteredItems(filtered);
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
      fetchItems();
    } catch (error) {
      alert('Error saving item: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleDelete = async (item) => {
    if (window.confirm(`Delete item: ${item.name}?`)) {
      try {
        await axios.delete(`/api/items/${item.item_id}`);
        fetchItems();
      } catch (error) {
        alert('Error deleting item');
      }
    }
  };

  const editItem = (item) => {
    setFormData({
      name: item.name,
      category: item.category,
      description: item.description || '',
      is_ada_friendly: item.is_ada_friendly,
      fluid_ml: item.fluid_ml || '',
      carbs_g: item.carbs_g || '',
      sodium_mg: item.sodium_mg || '',
      calories: item.calories || ''
    });
    setEditingItem(item);
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: '',
      description: '',
      is_ada_friendly: false,
      fluid_ml: '',
      carbs_g: '',
      sodium_mg: '',
      calories: ''
    });
    setEditingItem(null);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Food Items</h1>
        {canEdit && (
          <button 
            onClick={() => { resetForm(); setShowForm(true); }}
            style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Add Item
          </button>
        )}
      </div>
      
      {showForm && (
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h2>{editingItem ? 'Edit Item' : 'Add New Item'}</h2>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div>
                <label>Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                  style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd' }}
                />
              </div>
              <div>
                <label>Category *</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  required
                  placeholder="e.g., Beverages, Breads, etc."
                  style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd' }}
                />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label>Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd' }}
                />
              </div>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="checkbox"
                    checked={formData.is_ada_friendly}
                    onChange={(e) => setFormData({...formData, is_ada_friendly: e.target.checked})}
                  />
                  ADA Friendly
                </label>
              </div>
              <div></div>
              <div>
                <label>Fluid (ml)</label>
                <input
                  type="number"
                  value={formData.fluid_ml}
                  onChange={(e) => setFormData({...formData, fluid_ml: e.target.value})}
                  style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd' }}
                />
              </div>
              <div>
                <label>Carbs (g)</label>
                <input
                  type="number"
                  value={formData.carbs_g}
                  onChange={(e) => setFormData({...formData, carbs_g: e.target.value})}
                  style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd' }}
                />
              </div>
              <div>
                <label>Sodium (mg)</label>
                <input
                  type="number"
                  value={formData.sodium_mg}
                  onChange={(e) => setFormData({...formData, sodium_mg: e.target.value})}
                  style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd' }}
                />
              </div>
              <div>
                <label>Calories</label>
                <input
                  type="number"
                  value={formData.calories}
                  onChange={(e) => setFormData({...formData, calories: e.target.value})}
                  style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd' }}
                />
              </div>
            </div>
            <div style={{ marginTop: '20px' }}>
              <button type="submit" style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', marginRight: '10px' }}>
                {editingItem ? 'Update' : 'Create'} Item
              </button>
              <button type="button" onClick={() => { setShowForm(false); resetForm(); }} style={{ padding: '10px 20px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px' }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
      
      <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Search items..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ flex: 1, padding: '10px', borderRadius: '4px', border: '1px solid #ddd' }}
        />
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ddd' }}
        >
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8f9fa' }}>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Name</th>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Category</th>
              <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #dee2e6' }}>ADA</th>
              <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #dee2e6' }}>Fluid (ml)</th>
              <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #dee2e6' }}>Carbs (g)</th>
              <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #dee2e6' }}>Sodium (mg)</th>
              <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #dee2e6' }}>Calories</th>
              {canEdit && <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #dee2e6' }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={canEdit ? "8" : "7"} style={{ padding: '20px', textAlign: 'center', color: '#6c757d' }}>
                  {searchTerm || selectedCategory !== 'All Categories' ? 'No items match your filters' : 'No items found'}
                </td>
              </tr>
            ) : (
              filteredItems.map(item => (
                <tr key={item.item_id} style={{ borderBottom: '1px solid #dee2e6' }}>
                  <td style={{ padding: '12px' }}>{item.name}</td>
                  <td style={{ padding: '12px' }}>{item.category}</td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>{item.is_ada_friendly ? '✓' : ''}</td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>{item.fluid_ml || '-'}</td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>{item.carbs_g || '-'}</td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>{item.sodium_mg || '-'}</td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>{item.calories || '-'}</td>
                  {canEdit && (
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <button onClick={() => editItem(item)} style={{ marginRight: '5px', padding: '5px 10px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '0.875rem' }}>
                        Edit
                      </button>
                      {canDelete && (
                        <button onClick={() => handleDelete(item)} style={{ padding: '5px 10px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '0.875rem' }}>
                          Delete
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      <p style={{ marginTop: '10px', color: '#6c757d' }}>
        Showing {filteredItems.length} of {items.length} items
      </p>
    </div>
  );
};

export default Items;
