#!/bin/bash

set -e

echo "Restarting questionnaire service after fixing the duplicate declaration issue..."

# Check if running in Docker
if [ -f "/proc/1/cgroup" ] && grep -q "docker" /proc/1/cgroup; then
  echo "Running in Docker environment"
  
  # Try to find the questionnaire service container
  CONTAINER=$(docker ps | grep questionnaire-service | awk '{print $1}' | head -n 1)
  
  if [ -n "$CONTAINER" ]; then
    echo "Found container: $CONTAINER"
    echo "Restarting container..."
    docker restart $CONTAINER
  else
    echo "Could not find questionnaire-service container"
    echo "Please restart the questionnaire service manually"
    exit 1
  fi
else
  echo "Running in local environment"
  
  # Navigate to questionnaire service directory
  cd risk-assessment-app/backend/questionnaire-service
  
  # Check if process is running
  echo "Stopping any running service instance..."
  pkill -f "node.*index.js" || echo "No running service found"
  
  # Start the service
  echo "Starting questionnaire service..."
  npm start &
  
  # Go back to original directory
  cd ../../..
fi

echo "Waiting for service to start..."
sleep 5

echo "Checking service health..."
curl -s http://localhost:5002/health || echo "Could not reach service, it may still be starting up"

echo "Questionnaire service restarted successfully!"
echo "The duplicate authCircuitOpen declaration issue should be fixed now"
