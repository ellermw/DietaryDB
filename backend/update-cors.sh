#!/bin/sh
# Update server.js with comprehensive CORS fix
sed -i 's/app.use(cors());/app.use(cors({ origin: true, credentials: true }));/' /app/server.js
# Add preflight handling
sed -i '/app.use(cors/a app.options("*", cors());' /app/server.js
