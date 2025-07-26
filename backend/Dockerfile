# Use Node.js LTS version
FROM node:18-alpine

# Install PostgreSQL client for backup/restore functionality
RUN apk add --no-cache postgresql-client

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --only=production

# Copy application files
COPY . .

# Create backup directory
RUN mkdir -p /backups

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership of app and backup directories
RUN chown -R nodejs:nodejs /app /backups

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "server.js"]
