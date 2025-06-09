#!/bin/bash

# Comprehensive fix for missing modules in the API Gateway service
# This will install missing dependencies and fix configuration issues

echo "Starting comprehensive API Gateway module fix..."

# Step 1: Inspect the API Gateway container logs for detailed error information
echo "Checking detailed API Gateway logs for specific errors..."
docker-compose logs --tail=50 api-gateway > api-gateway-error-logs.txt
grep -A 5 "MODULE_NOT_FOUND" api-gateway-error-logs.txt

# Step 2: Create an enhanced Dockerfile that installs all potentially missing dependencies
echo "Creating enhanced Dockerfile with all required dependencies..."
cat > risk-assessment-app-api-gateway-enhanced.Dockerfile << 'EOF'
FROM risk-assessment-app-api-gateway
# Install axios explicitly
RUN npm install axios --save
# Install redis client (commonly used with express apps)
RUN npm install redis --save
# Install other common dependencies that might be missing
RUN npm install express-rate-limit cors cookie-parser dotenv --save
# Create config directory if it doesn't exist
RUN mkdir -p /app/src/config
# Add redis configuration if missing
RUN echo 'const redis = require("redis"); \
const client = redis.createClient({ url: process.env.REDIS_URL || "redis://redis:6379" }); \
client.on("error", (err) => console.log("Redis Client Error", err)); \
const getRedisClient = () => client; \
const isRedisReady = () => client.isReady; \
module.exports = { getRedisClient, isRedisReady };' > /app/src/config/redis.config.js
EOF

# Step 3: Build the enhanced image
echo "Building enhanced API Gateway image with all dependencies..."
docker build -t risk-assessment-app-api-gateway-enhanced -f risk-assessment-app-api-gateway-enhanced.Dockerfile .

# Step 4: Stop the current API Gateway container
echo "Stopping current API Gateway container..."
docker-compose stop api-gateway

# Step 5: Modify docker-compose to use our enhanced image
echo "Updating docker-compose configuration..."
sed -i.bak 's|image: risk-assessment-app-api-gateway-fixed|image: risk-assessment-app-api-gateway-enhanced|g' docker-compose.yml

# Step 6: Restart the API Gateway with the enhanced image
echo "Starting API Gateway with enhanced dependencies..."
docker-compose up -d api-gateway

# Step 7: Wait for service initialization
echo "Waiting for API Gateway to initialize..."
sleep 10

# Step 8: Check the status
echo "Checking final API Gateway status..."
docker-compose ps api-gateway

# Step 9: Check logs to verify it's working
echo "Checking logs for successful startup..."
docker-compose logs --tail=20 api-gateway

echo "Fix complete. If there are still issues, check api-gateway-error-logs.txt for detailed error information."
