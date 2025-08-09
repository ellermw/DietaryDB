// Debug script to monitor API calls
(function() {
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    console.log('Fetch called:', args[0]);
    return originalFetch.apply(this, args).then(response => {
      console.log('Response:', response.status, response.url);
      return response;
    });
  };

  // Also monitor XMLHttpRequest
  const originalOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    console.log('XHR called:', method, url);
    return originalOpen.apply(this, [method, url, ...rest]);
  };

  // Test the endpoints directly
  const testEndpoints = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.log('No token found - please login first');
      return;
    }

    console.log('Testing endpoints with token...');
    
    // Test database stats
    try {
      const statsResponse = await fetch('/api/tasks/database/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const stats = await statsResponse.json();
      console.log('Database stats:', stats);
    } catch (error) {
      console.error('Stats error:', error);
    }

    // Test categories
    try {
      const catResponse = await fetch('/api/categories/detailed', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const categories = await catResponse.json();
      console.log('Categories:', categories);
    } catch (error) {
      console.error('Categories error:', error);
    }
  };

  // Run test after 2 seconds
  setTimeout(testEndpoints, 2000);
  
  console.log('Debug injection loaded - monitoring all API calls');
})();
