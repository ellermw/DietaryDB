FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm install --only=production

# Copy application files
COPY . .

# Remove any old routes that might be in the image
RUN rm -rf /app/routes/patients.js /app/routes/orders.js /app/routes/system.js /app/routes/menus.js

EXPOSE 3000

CMD ["node", "server.js"]
