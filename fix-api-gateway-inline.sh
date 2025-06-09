#!/bin/bash

# This script performs a direct fix on the API Gateway by modifying the package.json and installing dependencies 
# inside the running container, rather than trying to build a new image

echo "Starting direct in-container API Gateway fix..."

# Step 1: First, stop the current container
echo "Stopping the current API Gateway container..."
docker-compose stop api-gateway

# Step 2: Restart the container with the original image to ensure we have a clean state
echo "Reverting to original image configuration..."
sed -i.bak 's|image: risk-assessment-app-api-gateway-enhanced|image: risk-assessment-app-api-gateway|g' docker-compose.yml

# Step 3: Start the container without starting the application (override the CMD)
echo "Starting the container without running the application..."
docker-compose up -d --no-start api-gateway
docker-compose start api-gateway

# Step 4: Add the dependencies to package.json directly
echo "Updating package.json in the container..."
docker exec api-gateway bash -c "cat > /tmp/update-pkg.js << 'EOF'
const fs = require('fs');
const path = '/app/package.json';
const pkg = require(path);
pkg.dependencies = pkg.dependencies || {};
pkg.dependencies.axios = '^1.3.4';
pkg.dependencies.redis = '^4.6.6';
pkg.dependencies['express-rate-limit'] = '^6.7.0';
pkg.dependencies.cors = '^2.8.5';
pkg.dependencies['cookie-parser'] = '^1.4.6';
pkg.dependencies.dotenv = '^16.0.3';
fs.writeFileSync(path, JSON.stringify(pkg, null, 2));
console.log('Updated package.json successfully');
EOF"

docker exec api-gateway node /tmp/update-pkg.js

# Step 5: Install the dependencies properly
echo "Installing dependencies inside the container..."
docker exec api-gateway bash -c "cd /app && npm install"

# Step 6: Create any missing config files
echo "Creating missing configuration files..."
docker exec api-gateway bash -c "mkdir -p /app/src/config"
docker exec api-gateway bash -c "if [ ! -f /app/src/config/redis.config.js ]; then 
  echo 'const redis = require(\"redis\"); 
const client = redis.createClient({ url: process.env.REDIS_URL || \"redis://redis:6379\" }); 
client.on(\"error\", (err) => console.log(\"Redis Client Error\", err)); 
const getRedisClient = () => client; 
const isRedisReady = () => client.isReady; 
module.exports = { getRedisClient, isRedisReady };' > /app/src/config/redis.config.js; 
fi"

# Step 7: Restart the container properly to apply changes
echo "Restarting API Gateway with all dependencies installed..."
docker-compose restart api-gateway

# Step 8: Wait for service to initialize
echo "Waiting for API Gateway to initialize..."
sleep 10

# Step 9: Check the status
echo "Checking API Gateway status..."
docker-compose ps api-gateway

# Step 10: Check logs to verify it's working
echo "Checking logs for successful startup..."
docker-compose logs --tail=20 api-gateway

echo "Fix complete. The API Gateway should now be running with all required dependencies."
