FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL required dependencies
RUN npm install express@4.18.2 \
    cors@2.8.5 \
    helmet@7.0.0 \
    morgan@1.10.0 \
    compression@1.7.4 \
    dotenv@16.0.3 \
    pg@8.10.0 \
    bcryptjs@2.4.3 \
    jsonwebtoken@9.0.0 \
    node-cron@3.0.2 \
    child_process \
    && npm cache clean --force

# Copy application files
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3000

CMD ["node", "server.js"]
