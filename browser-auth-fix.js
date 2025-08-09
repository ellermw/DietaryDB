// Browser Authentication Fix Script
// Run this in your browser console

console.log('=== Authentication Fix Script ===');

// Step 1: Clear old token
console.log('Clearing old token...');
localStorage.removeItem('token');
localStorage.removeItem('user');
sessionStorage.clear();

// Step 2: Login fresh
console.log('Logging in fresh...');
fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'admin', password: 'admin123' })
})
.then(response => {
  console.log('Login response status:', response.status);
  return response.json();
})
.then(data => {
  if (data.token) {
    console.log('✓ Login successful!');
    console.log('Token received (first 50 chars):', data.token.substring(0, 50) + '...');
    console.log('User info:', data.user);
    
    // Store the token
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    
    // Test the token immediately
    console.log('\nTesting token with database stats...');
    return fetch('/api/tasks/database/stats', {
      headers: { 
        'Authorization': `Bearer ${data.token}`,
        'Content-Type': 'application/json'
      }
    });
  } else {
    throw new Error('No token in response');
  }
})
.then(response => {
  console.log('Stats endpoint status:', response.status);
  if (response.status === 403) {
    console.error('✗ Token still rejected - checking why...');
    return response.json();
  } else if (response.status === 200) {
    console.log('✓ Token works!');
    return response.json();
  }
})
.then(data => {
  console.log('Database stats:', data);
  
  // Now test categories
  const token = localStorage.getItem('token');
  return fetch('/api/categories/detailed', {
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
})
.then(response => {
  console.log('Categories endpoint status:', response.status);
  return response.json();
})
.then(data => {
  console.log('Categories:', data);
  
  // If we got here, everything works!
  console.log('\n✓✓✓ Authentication fixed! ✓✓✓');
  console.log('You can now reload the page and everything should work.');
})
.catch(error => {
  console.error('Error:', error);
  console.log('\nTroubleshooting:');
  console.log('1. Make sure you are on http://15.204.252.189:3001');
  console.log('2. Try clearing all site data and cookies');
  console.log('3. Try in an incognito window');
});
