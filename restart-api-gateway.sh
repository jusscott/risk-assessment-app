#!/bin/bash

echo "Restarting API Gateway container..."
docker restart api-gateway

# Wait a moment for the container to start up
sleep 5

echo "Checking API Gateway logs for startup..."
docker logs api-gateway --tail 20

echo "API Gateway restarted. Monitor logs for any remaining errors with:"
echo "docker logs api-gateway -f"
