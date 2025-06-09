#!/bin/bash

echo "Stopping api-gateway..."
docker-compose stop api-gateway

echo "Installing missing dependencies in api-gateway container..."
docker-compose run --rm --no-deps api-gateway npm install axios

echo "Restarting api-gateway..."
docker-compose up -d api-gateway

echo "Waiting for service to stabilize..."
sleep 5

echo "Checking service status..."
docker-compose ps api-gateway
