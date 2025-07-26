FROM node:18-alpine

WORKDIR /app

# Install PostgreSQL client for backups
RUN apk add --no-cache postgresql-client

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application files
COPY . .

# Create backups directory
RUN mkdir -p /backups

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "server.js"]