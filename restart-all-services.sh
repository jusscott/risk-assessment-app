#!/bin/bash

# Script to restart all Docker containers and services for the Risk Assessment App
# This script should be run from the project root directory

echo "========== RESTARTING ALL SERVICES =========="
echo "This script will stop all running containers, prune any dangling resources, and restart everything."
echo ""

# Navigate to the project root directory
cd "$(dirname "$0")"
PROJECT_ROOT=$(pwd)

echo "Current directory: $PROJECT_ROOT"
echo ""

# Stop all running containers (gracefully)
echo "Stopping all running Docker containers..."
docker-compose down
echo "All containers stopped."
echo ""

# Optional: Remove dangling volumes and networks (uncomment if needed)
echo "Removing dangling Docker resources..."
docker system prune -f
echo "Dangling resources removed."
echo ""

# Start all services
echo "Starting all services..."
docker-compose up -d
echo "All services started in detached mode."
echo ""

# Wait a moment to let services initialize
echo "Waiting for services to initialize..."
sleep 10

# Restart the frontend development server (if running locally)
echo "Restarting frontend development server..."
cd "$PROJECT_ROOT/frontend"
if [ -f "package.json" ]; then
  echo "Stopping any running npm processes..."
  pkill -f "npm run dev" || true
  
  echo "Starting frontend development server..."
  npm run dev &
  FRONTEND_PID=$!
  echo "Frontend server started with PID: $FRONTEND_PID"
else
  echo "No package.json found in frontend directory. Skipping frontend restart."
fi
echo ""

# Check running containers
echo "Currently running containers:"
docker-compose ps
echo ""

# Check if the circuit breaker monitor is running
echo "Checking circuit breaker monitor..."
if docker ps | grep -q "circuit-breaker-monitor"; then
  echo "Circuit breaker monitor is running."
else
  echo "Starting circuit breaker monitor..."
  cd "$PROJECT_ROOT/backend/scripts/circuit-breaker"
  if [ -f "Dockerfile" ]; then
    docker-compose -f docker-compose.monitor.yml up -d || echo "Failed to start circuit breaker monitor."
  else
    echo "No Dockerfile found for circuit breaker monitor."
  fi
fi
echo ""

echo "All services have been restarted."
echo "You can monitor logs with: docker-compose logs -f"
echo ""
echo "========== RESTART COMPLETE =========="

# Return to the project root
cd "$PROJECT_ROOT"
