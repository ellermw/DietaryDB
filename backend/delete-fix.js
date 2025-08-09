// Add this to your backend's delete category endpoint
app.delete('/api/categories/:name', async (req, res) => {
  const categoryName = decodeURIComponent(req.params.name);
  
  try {
    // Check for ACTIVE items only
    const activeCheck = await pool.query(
      'SELECT COUNT(*) FROM items WHERE category = $1 AND is_active = true',
      [categoryName]
    );
    
    const activeCount = parseInt(activeCheck.rows[0].count);
    
    if (activeCount > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete category',
        reason: `This category has ${activeCount} active item(s). Please delete them first.`,
        itemCount: activeCount
      });
    }
    
    // Check for INACTIVE items
    const inactiveCheck = await pool.query(
      'SELECT COUNT(*) FROM items WHERE category = $1 AND is_active = false',
      [categoryName]
    );
    
    const inactiveCount = parseInt(inactiveCheck.rows[0].count);
    
    if (inactiveCount > 0) {
      // Optionally, permanently delete inactive items
      // await pool.query('DELETE FROM items WHERE category = $1 AND is_active = false', [categoryName]);
      
      return res.status(400).json({ 
        message: 'Cannot delete category',
        reason: `This category has ${inactiveCount} deleted item(s) in the trash. Please permanently remove them first.`,
        inactiveCount: inactiveCount
      });
    }
    
    // If no items at all, delete the category
    const result = await pool.query(
      'DELETE FROM categories WHERE name = $1 RETURNING *',
      [categoryName]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    await logActivity(1, 'admin', 'Delete Category', `Deleted: ${categoryName}`);
    res.json({ message: 'Category deleted successfully' });
    
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ message: 'Error deleting category' });
  }
});
