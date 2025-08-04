FROM node:18-alpine

# Install PostgreSQL client for backups
RUN apk add --no-cache postgresql-client

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application files
COPY . .

# Expose port
EXPOSE 3000

# Start the application
CMD ["sh", "/app/start.sh"]
