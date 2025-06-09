#!/bin/bash

# This script fixes issues with both API Gateway and Frontend services

echo "==============================================="
echo "Starting comprehensive risk assessment app fix"
echo "==============================================="

# First, check the docker-compose.yml file
echo "Checking docker-compose.yml for syntax errors..."
if grep -q "services:Frontend" docker-compose.yml; then
  echo "Fixing docker-compose.yml syntax error..."
  # Fix the syntax error in docker-compose.yml
  sed -i.bak 's/services:Frontend/services:/' docker-compose.yml
  echo "docker-compose.yml fixed"
fi

# API Gateway fixes
echo -e "\n==============================================="
echo "Fixing API Gateway service"
echo "==============================================="

echo "Stopping any existing API Gateway container..."
docker-compose stop api-gateway

echo "Creating a Dockerfile for the enhanced API Gateway..."
cat > api-gateway-fixed.Dockerfile << 'EOF'
FROM node:18-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY ./backend/api-gateway/package.json .
COPY ./backend/api-gateway/package-lock.json* .

# Install required dependencies
RUN npm install
RUN npm install axios redis express-rate-limit cors cookie-parser dotenv --save

# Create config directory
RUN mkdir -p /app/src/config

# Add Redis configuration file
RUN echo 'const redis = require("redis"); \
const client = redis.createClient({ url: process.env.REDIS_URL || "redis://redis:6379" }); \
client.on("error", (err) => console.log("Redis Client Error", err)); \
const getRedisClient = async () => { \
  if (!client.isReady) await client.connect(); \
  return client; \
}; \
const isRedisReady = () => client.isReady; \
module.exports = { getRedisClient, isRedisReady };' > /app/src/config/redis.config.js

# Copy source code
COPY ./backend/api-gateway/src ./src

# Expose the port
EXPOSE 5000

# Start the service
CMD ["node", "src/index.js"]
EOF

echo "Building fixed API Gateway image..."
docker build -f api-gateway-fixed.Dockerfile -t risk-assessment-app-api-gateway-fixed .

echo "Updating docker-compose to use fixed API Gateway image..."
sed -i.bak 's|image: risk-assessment-app-api-gateway.*|image: risk-assessment-app-api-gateway-fixed|g' docker-compose.yml

# Frontend fixes
echo -e "\n==============================================="
echo "Fixing Frontend service"
echo "==============================================="

echo "Checking if frontend container exists..."
if ! docker-compose ps frontend | grep -q frontend; then
  echo "Frontend container not found, rebuilding..."
  # Force rebuild of frontend
  docker-compose build --no-cache frontend
fi

# Restart all services
echo -e "\n==============================================="
echo "Restarting all services"
echo "==============================================="

echo "Stopping all services..."
docker-compose down

echo "Starting all services..."
docker-compose up -d

echo "Waiting for services to initialize (30 seconds)..."
sleep 30

echo "Checking service status..."
docker-compose ps

echo -e "\n==============================================="
echo "Fix complete. The app should now be accessible at http://localhost:3000"
echo "==============================================="

# Provide additional diagnostics
echo -e "\nAPI Gateway logs (last 10 lines):"
docker-compose logs --tail=10 api-gateway

echo -e "\nFrontend logs (last 10 lines):"
docker-compose logs --tail=10 frontend

echo -e "\nIf the site is still not accessible, check the full logs with:"
echo "docker-compose logs api-gateway"
echo "docker-compose logs frontend"
