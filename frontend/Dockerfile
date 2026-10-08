# Use Official Node.js 20 lightweight alpine image as the base image
FROM node:20-alpine

# Set working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json into the container
COPY package*.json ./

# Install Node.js dependencies
RUN npm install

# Copy the rest of the frontend application code
COPY . .

# Expose vite development server port
EXPOSE 5173

# Start vite development server bound 0.0.0.0 for external docker access
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]