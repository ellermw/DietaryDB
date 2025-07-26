FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy all source files
COPY . .

# Expose port 3000 (React dev server)
EXPOSE 3000

# Start React development server
CMD ["npm", "start"]
