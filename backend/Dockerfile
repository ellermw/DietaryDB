FROM node:18-alpine

WORKDIR /app

# Install PostgreSQL client for backups
RUN apk add --no-cache postgresql-client

# Copy package files first
COPY package*.json ./

# Install all dependencies
RUN npm ci || npm install

# Copy all application files
COPY . .

# Ensure node_modules permissions are correct
RUN chmod -R 755 node_modules

EXPOSE 3000

# Run as node user (default in node:18-alpine)
CMD ["node", "server.js"]
