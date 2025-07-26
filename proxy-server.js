const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const app = express();

// Serve the frontend
app.use(express.static('.'));

// Proxy API requests to backend
app.use('/api', createProxyMiddleware({
  target: 'http://localhost:3000',
  changeOrigin: true,
  onProxyReq: (proxyReq, req, res) => {
    console.log('Proxying:', req.method, req.url);
  },
  onProxyRes: (proxyRes, req, res) => {
    console.log('Response:', proxyRes.statusCode);
  }
}));

app.listen(3003, () => {
  console.log('Proxy server running on port 3003');
  console.log('Frontend: http://192.168.1.74:3003');
  console.log('This proxy handles all CORS issues');
});
