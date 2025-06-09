#!/bin/bash

# Comprehensive script to fix the API Gateway service by properly installing missing dependencies
# and ensuring they persist in the container

echo "Starting comprehensive API Gateway fix..."

# Step 1: Stop the api-gateway container
echo "Stopping API Gateway container..."
docker-compose stop api-gateway

# Step 2: Check if package.json exists and add axios to it if needed
echo "Checking API Gateway package.json..."
docker-compose run --rm --entrypoint /bin/sh api-gateway -c "grep -q '\"axios\"' /app/package.json || sed -i 's/\"dependencies\": {/\"dependencies\": {\n    \"axios\": \"^1.3.4\",/g' /app/package.json"
echo "Updated package.json with axios dependency"

# Step 3: Install all dependencies properly
echo "Installing all dependencies..."
docker-compose run --rm --entrypoint /bin/sh api-gateway -c "cd /app && npm install"
echo "All dependencies installed"

# Step 4: Create a test file to verify axios is available
echo "Creating test file to verify axios installation..."
docker-compose run --rm --entrypoint /bin/sh api-gateway -c "echo 'const axios = require(\"axios\"); console.log(\"Axios version:\", axios.VERSION || \"installed\");' > /app/test-axios.js && node /app/test-axios.js"

# Step 5: Restart the API Gateway service
echo "Restarting API Gateway service..."
docker-compose up -d api-gateway

# Step 6: Wait for the service to initialize
echo "Waiting for API Gateway to initialize..."
sleep 10

# Step 7: Check the status
echo "Checking API Gateway container status..."
docker-compose ps api-gateway

# Step 8: Check the logs (last 15 lines)
echo "Checking logs..."
docker-compose logs --tail=15 api-gateway

# Step 9: Check if frontend container exists and restart it if needed
if docker-compose ps | grep -q frontend; then
  echo "Restarting frontend container to connect to fixed API Gateway..."
  docker-compose restart frontend
fi

echo "Fix complete. If the service is still restarting, check the logs with 'docker-compose logs api-gateway'"
