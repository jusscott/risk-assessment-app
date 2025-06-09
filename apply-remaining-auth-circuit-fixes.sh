#!/bin/bash
# This script applies the remaining authCircuitOpen fixes and restarts the questionnaire service

echo "=== Applying remaining authCircuitOpen fixes ==="
node fix-remaining-auth-circuit-duplicates.js

if [ $? -ne 0 ]; then
  echo "Error applying fixes. Aborting."
  exit 1
fi

echo "=== Restarting questionnaire service ==="
# Check if running in Docker environment
if [ -f /.dockerenv ] || grep -q docker /proc/1/cgroup 2>/dev/null; then
  echo "Docker environment detected, using Docker commands"
  docker-compose restart questionnaire-service
else
  echo "Non-Docker environment detected, using direct restart"
  cd backend/questionnaire-service
  
  # Kill any existing process
  pkill -f "node.*questionnaire-service" || true
  
  # Wait for process to fully terminate
  sleep 2
  
  # Start the service
  nohup npm start > ../logs/questionnaire-service.log 2>&1 &
  
  echo "Service restarted in background. Check logs for status."
  cd ../..
fi

echo "=== Fix application complete ==="
echo "You can check if the service is running properly with:"
echo "curl http://localhost:3000/api/health"
