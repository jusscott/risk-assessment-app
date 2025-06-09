#!/bin/bash

echo "Restarting questionnaire service after enhanced-client.js and auth.middleware.js fixes..."

# Navigate to the questionnaire service directory (if necessary)
cd ./risk-assessment-app/backend/questionnaire-service

# Check if running in Docker
if [ -n "$(docker ps | grep questionnaire-service)" ]; then
  echo "Restarting questionnaire service Docker container..."
  docker restart questionnaire-service
else
  echo "Restarting questionnaire service locally..."
  # Kill any existing process
  pkill -f "node.*questionnaire-service" || true
  
  # Start the service in the background
  npm start &
fi

echo "Waiting for service to start up..."
sleep 5

echo "Testing service health..."
curl -s http://localhost:5001/health || echo "Could not reach health endpoint, but service may still be starting up."

echo "Fix applied. The service is restarting."
