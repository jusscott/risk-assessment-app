#!/bin/bash

# Script to fix the API Gateway service by installing missing dependencies

echo "Fixing API Gateway service..."

# Step 1: Stop the api-gateway container
docker-compose stop api-gateway
echo "API Gateway container stopped"

# Step 2: Start the container in a shell mode without running the application
docker-compose run --rm --entrypoint /bin/sh api-gateway -c "npm install axios && echo 'Axios module installed successfully'"
echo "Dependencies installed"

# Step 3: Start the API Gateway service
docker-compose up -d api-gateway
echo "API Gateway service started"

# Step 4: Wait for the service to initialize
echo "Waiting for API Gateway to initialize..."
sleep 5

# Step 5: Check the status
docker-compose ps api-gateway
echo "API Gateway service should now be running correctly"

# Step 6: Check the logs (last 10 lines)
echo "Checking logs..."
docker-compose logs --tail=10 api-gateway

echo "Fix complete. If the service is still restarting, run 'docker-compose logs api-gateway' to see the latest errors."
