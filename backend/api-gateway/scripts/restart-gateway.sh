#!/bin/bash

# Script to restart the API Gateway service after configuration changes

echo "Stopping API Gateway service..."
# Find and kill the running API Gateway process
PID=$(pgrep -f "node.*api-gateway/src/index.js" || echo "")

if [ -n "$PID" ]; then
  echo "Killing process $PID"
  kill $PID
  sleep 2
else
  echo "No running API Gateway process found"
fi

echo "Starting API Gateway service..."
cd "$(dirname "$0")/.."

# Start the service in the background
NODE_ENV=development nohup node src/index.js > ./gateway.log 2>&1 &

echo "API Gateway restarted. Check ./gateway.log for details."
echo "Configuration changes have been applied."
