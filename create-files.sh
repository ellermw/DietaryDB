#!/bin/bash

# Quick script to create all necessary files for the admin frontend
# Run this before setup.sh if you're missing files

echo "Creating admin frontend files..."

# Create directories
mkdir -p admin-frontend/{public,src/{pages,components,contexts}}

# Create public files
cat > admin-frontend/public/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#000000" />
    <meta
      name="description"
      content="Hospital Dietary Management System - Admin Portal"
    />
    <link rel="manifest" href="%PUBLIC_URL%/manifest.json" />
    <title>Dietary Admin</title>
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
  </body>
</html>
EOF

cat > admin-frontend/public/manifest.json << 'EOF'
{
  "short_name": "Dietary Admin",
  "name": "Hospital Dietary Management Admin",
  "start_url": ".",
  "display": "standalone",
  "theme_color": "#000000",
  "background_color": "#ffffff"
}
EOF

cat > admin-frontend/public/robots.txt << 'EOF'
# https://www.robotstxt.org/robotstxt.html
User-agent: *
Disallow:
EOF

# Create src files
cat > admin-frontend/src/index.js << 'EOF'
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
EOF

cat > admin-frontend/src/index.css << 'EOF'
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  margin: 0;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background-color: #f3f4f6;
  color: #111827;
}

code {
  font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New',
    monospace;
}

/* Tailwind CSS CDN */
@import url('https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css');

/* Custom scrollbar */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
}

::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #555;
}

/* Loading spinner */
.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
EOF

cat > admin-frontend/src/App.css << 'EOF'
.App {
  min-height: 100vh;
}

/* React Toastify Custom Styles */
.Toastify__toast {
  font-family: 'Inter', sans-serif;
}

.Toastify__toast--success {
  background: #10b981;
}

.Toastify__toast--error {
  background: #ef4444;
}

.Toastify__toast--warning {
  background: #f59e0b;
}

.Toastify__toast--info {
  background: #3b82f6;
}
EOF

# Create gitignore files
cat > admin-frontend/.gitignore << 'EOF'
# dependencies
/node_modules
/.pnp
.pnp.js

# testing
/coverage

# production
/build

# misc
.DS_Store
.env.local
.env.development.local
.env.test.local
.env.production.local

npm-debug.log*
yarn-debug.log*
yarn-error.log*
EOF

cat > backend/.gitignore << 'EOF'
node_modules/
.env
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.DS_Store
*.log
EOF

echo "✓ Admin frontend files created"
echo ""
echo "Now you can run ./setup.sh"
