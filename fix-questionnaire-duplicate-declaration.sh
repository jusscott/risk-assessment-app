#!/bin/bash

set -e

echo "Fixing duplicate declaration issue in questionnaire service..."

# Run the fix script
echo "Applying fix for duplicate authCircuitOpen declaration..."
node fix-duplicate-auth-circuit-declaration.js

# Restart the questionnaire service
echo "Restarting questionnaire service..."

# Check if running in Docker or local development
if [ -f "backend/questionnaire-service/Dockerfile" ]; then
  # Docker environment
  echo "Detected Docker environment, using Docker commands to restart..."
  
  # Try to get the container name
  CONTAINER=$(docker ps | grep questionnaire-service | awk '{print $1}')
  
  if [ -n "$CONTAINER" ]; then
    echo "Found container: $CONTAINER"
    echo "Restarting container..."
    docker restart $CONTAINER
  else
    echo "Could not find questionnaire-service container. Attempting alternative restart..."
    cd backend/questionnaire-service
    npm run start
    cd ../..
  fi
else
  # Local development
  echo "Using local restart..."
  cd backend/questionnaire-service
  npm run restart || npm run start
  cd ../..
fi

echo "Questionnaire service should now be restarted with the fix applied."
echo "Check logs for any remaining errors."

# Make a test request to verify the service is working
echo "Verifying service is responding..."
curl -s http://localhost:5002/health || echo "Service may still be starting up, please check logs"

echo "Fix complete! The 'authCircuitOpen' duplicate declaration issue should be resolved."
