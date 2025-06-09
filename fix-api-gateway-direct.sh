#!/bin/bash

# This script performs a direct fix on the API Gateway using a Dockerfile approach
# since the container doesn't have bash installed

echo "Starting direct API Gateway fix with Dockerfile approach..."

# Step 1: First, stop the current container
echo "Stopping the current API Gateway container..."
docker-compose stop api-gateway

# Step 2: Create a temporary Dockerfile for our enhanced API Gateway
echo "Creating enhanced Dockerfile..."
cat > api-gateway-fix.Dockerfile << 'EOF'
FROM risk-assessment-app-api-gateway:latest

# Install required dependencies
RUN npm install axios --save
RUN npm install redis --save
RUN npm install express-rate-limit cors cookie-parser dotenv --save

# Create config directory if it doesn't exist
RUN mkdir -p /app/src/config

# Add Redis configuration file
RUN echo 'const redis = require("redis"); \
const client = redis.createClient({ url: process.env.REDIS_URL || "redis://redis:6379" }); \
client.on("error", (err) => console.log("Redis Client Error", err)); \
const getRedisClient = () => client; \
const isRedisReady = () => client.isReady; \
module.exports = { getRedisClient, isRedisReady };' > /app/src/config/redis.config.js
EOF

# Step 3: Build the fixed image
echo "Building fixed API Gateway image..."
docker build -f api-gateway-fix.Dockerfile -t risk-assessment-app-api-gateway-fixed .

# Step 4: Update docker-compose.yml to use the fixed image
echo "Updating docker-compose configuration..."
sed -i.bak 's|image: risk-assessment-app-api-gateway.*|image: risk-assessment-app-api-gateway-fixed|g' docker-compose.yml

# Step 5: Start the services again
echo "Starting services with fixed API Gateway..."
docker-compose up -d

# Step 6: Wait for service to initialize
echo "Waiting for API Gateway to initialize..."
sleep 15

# Step 7: Check the status
echo "Checking API Gateway status..."
docker-compose ps api-gateway

# Step 8: Check logs to verify it's working
echo "Checking logs for successful startup..."
docker-compose logs --tail=20 api-gateway

echo "Fix complete. The API Gateway should now be running with all required dependencies."
