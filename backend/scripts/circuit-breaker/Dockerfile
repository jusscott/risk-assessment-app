FROM node:16-alpine

WORKDIR /app

# Copy package.json and package-lock.json files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application files
COPY . .

# Create data and logs directories
RUN mkdir -p data/circuit-monitor logs

# Set environment variables
ENV NODE_ENV=production
ENV API_GATEWAY_URL=http://api-gateway:5000

# Expose a port for potential UI/API in the future
EXPOSE 3030

# Run the monitoring script
CMD ["npm", "run", "start:prod"]
