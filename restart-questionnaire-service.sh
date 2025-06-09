#!/bin/bash

# Script to restart the questionnaire service and apply fixes

echo "===== Restarting questionnaire service ====="

# Check if we're running in Docker environment
if [ -f "/.dockerenv" ] || [ -f "/proc/1/cgroup" ] && grep -q "docker" /proc/1/cgroup; then
  echo "Docker environment detected"
  
  # In Docker, use docker-compose to restart the service
  echo "Restarting questionnaire-service container..."
  docker-compose restart questionnaire-service
  
  # Wait a bit to let the service come up
  echo "Waiting for service to start..."
  sleep 10
  
  # Check service status
  echo "Checking service status..."
  docker-compose ps questionnaire-service
else
  # Not in Docker, try to restart the service locally
  echo "Local environment detected"
  
  # Check if we have a process running on port 5002
  PID=$(lsof -i:5002 -t)
  
  if [ ! -z "$PID" ]; then
    echo "Found process running on port 5002, stopping it..."
    kill $PID
    sleep 2
    # Check if it's still running and force kill if needed
    if ps -p $PID > /dev/null; then
      echo "Process still running, force stopping..."
      kill -9 $PID
    fi
  fi
  
  # Start the service in the background
  echo "Starting questionnaire service..."
  cd risk-assessment-app/backend/questionnaire-service
  npm start &
  cd ../../..
  
  # Wait a bit to let the service come up
  echo "Waiting for service to start..."
  sleep 5
fi

echo "===== Service restart attempted ====="
echo "To verify the service is running correctly, try:"
echo "1. curl http://localhost:5002/health"
echo "2. Run node fix-questionnaire-loading-issues.js to apply comprehensive fixes"
echo "3. Then try loading questionnaires in the application"
