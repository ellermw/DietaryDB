#!/bin/bash
# /opt/dietarydb/fix-category-deletion.sh
# Fix category deletion - check for inactive items

set -e

echo "======================================"
echo "Fixing Category Deletion Issue"
echo "======================================"
echo ""

cd /opt/dietarydb

# Step 1: Diagnose the problem
echo "Step 1: Diagnosing why categories can't be deleted"
echo "=================================================="
echo ""

echo "Checking all items (active and inactive) by category:"
docker exec dietary_postgres psql -U dietary_user -d dietary_db << 'EOF'
-- Show all items grouped by category and active status
SELECT 
    category, 
    is_active,
    COUNT(*) as count
FROM items
GROUP BY category, is_active
ORDER BY category, is_active;
EOF
echo ""

echo "Categories table with counts:"
docker exec dietary_postgres psql -U dietary_user -d dietary_db << 'EOF'
-- Show categories with their stored counts
SELECT name, item_count FROM categories ORDER BY name;
EOF
echo ""

echo "Actual active items per category:"
docker exec dietary_postgres psql -U dietary_user -d dietary_db << 'EOF'
-- Show real count of active items
SELECT 
    c.name,
    c.item_count as stored_count,
    COUNT(i.item_id) as actual_active_items
FROM categories c
LEFT JOIN items i ON c.name = i.category AND i.is_active = true
GROUP BY c.name, c.item_count
ORDER BY c.name;
EOF
echo ""

# Step 2: Fix the counts in the database
echo "Step 2: Fixing category item counts"
echo "===================================="
docker exec dietary_postgres psql -U dietary_user -d dietary_db << 'EOF'
-- First, reset all counts to 0
UPDATE categories SET item_count = 0;

-- Update with actual count of ACTIVE items only
UPDATE categories c 
SET item_count = (
    SELECT COUNT(*) 
    FROM items i 
    WHERE i.category = c.name 
    AND i.is_active = true
);

-- Show the updated counts
SELECT name, item_count FROM categories ORDER BY name;
EOF
echo ""

# Step 3: Option to permanently delete inactive items
echo "Step 3: Cleaning up inactive items"
echo "==================================="
echo ""
echo "Inactive items by category:"
docker exec dietary_postgres psql -U dietary_user -d dietary_db << 'EOF'
SELECT category, COUNT(*) as inactive_count
FROM items
WHERE is_active = false
GROUP BY category
ORDER BY category;
EOF
echo ""

read -p "Do you want to permanently DELETE all inactive items? This cannot be undone! (y/N): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Permanently deleting inactive items..."
    docker exec dietary_postgres psql -U dietary_user -d dietary_db << 'EOF'
-- Delete all inactive items permanently
DELETE FROM items WHERE is_active = false;

-- Verify deletion
SELECT 'Remaining items:', COUNT(*) FROM items;
EOF
else
    echo "Keeping inactive items. They may prevent category deletion."
fi
echo ""

# Step 4: Create a stored procedure to properly check category deletion
echo "Step 4: Creating proper category deletion check"
echo "==============================================="
docker exec dietary_postgres psql -U dietary_user -d dietary_db << 'EOF'
-- Create or replace function to check if category can be deleted
CREATE OR REPLACE FUNCTION can_delete_category(category_name VARCHAR)
RETURNS TABLE(can_delete BOOLEAN, active_items INTEGER, inactive_items INTEGER, message TEXT)
AS $$
DECLARE
    active_count INTEGER;
    inactive_count INTEGER;
BEGIN
    -- Count active items
    SELECT COUNT(*) INTO active_count
    FROM items
    WHERE category = category_name AND is_active = true;
    
    -- Count inactive items
    SELECT COUNT(*) INTO inactive_count
    FROM items
    WHERE category = category_name AND is_active = false;
    
    IF active_count > 0 THEN
        RETURN QUERY SELECT 
            false, 
            active_count, 
            inactive_count,
            'Category has ' || active_count || ' active items';
    ELSIF inactive_count > 0 THEN
        RETURN QUERY SELECT 
            false, 
            active_count, 
            inactive_count,
            'Category has ' || inactive_count || ' deleted (inactive) items that need to be permanently removed first';
    ELSE
        RETURN QUERY SELECT 
            true, 
            active_count, 
            inactive_count,
            'Category can be deleted';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Test the function on all categories
SELECT 
    c.name,
    check_result.*
FROM categories c
CROSS JOIN LATERAL can_delete_category(c.name) AS check_result
ORDER BY c.name;
EOF
echo ""

# Step 5: Update backend to handle this properly
echo "Step 5: Updating backend delete logic"
echo "====================================="

cat > backend/delete-fix.js << 'EOF'
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
EOF

echo "Sample delete endpoint code saved to backend/delete-fix.js"
echo ""

# Step 6: Quick fix - Force delete specific categories
echo "Step 6: Manual category cleanup option"
echo "======================================"
echo ""
echo "Categories that appear empty but can't be deleted:"
docker exec dietary_postgres psql -U dietary_user -d dietary_db << 'EOF'
SELECT 
    c.name,
    c.item_count as shown_count,
    (SELECT COUNT(*) FROM items WHERE category = c.name AND is_active = true) as active_items,
    (SELECT COUNT(*) FROM items WHERE category = c.name AND is_active = false) as inactive_items
FROM categories c
WHERE c.item_count = 0
ORDER BY c.name;
EOF
echo ""

echo "To force delete a specific category and all its inactive items:"
echo "Run: docker exec dietary_postgres psql -U dietary_user -d dietary_db -c \"DELETE FROM items WHERE category='CategoryName' AND is_active=false; DELETE FROM categories WHERE name='CategoryName';\""
echo ""

echo "======================================"
echo "Category Deletion Fix Complete!"
echo "======================================"
echo ""
echo "FINDINGS:"
echo "- Categories may have inactive (deleted) items preventing deletion"
echo "- The backend needs to check for inactive items separately"
echo ""
echo "SOLUTIONS:"
echo "1. Permanently delete all inactive items (if you chose 'y' above)"
echo "2. Update the backend to handle inactive items properly"
echo "3. Force delete specific categories using the command shown above"
echo ""
echo "The categories should now be deletable if they truly have no items!"
echo ""
