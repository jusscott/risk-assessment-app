#!/bin/bash

echo "Restarting API Gateway container..."
docker restart api-gateway

echo "Waiting for API Gateway to fully start up..."
sleep 5

echo "Checking API Gateway health..."
docker ps | grep api-gateway

echo "Viewing API Gateway logs (last 10 lines)..."
docker logs api-gateway --tail 10

echo "API Gateway restart completed."
