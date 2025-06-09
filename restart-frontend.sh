#!/bin/bash

# Script to restart just the frontend development server
# This is useful for testing the ResizeObserver fix without restarting all services

echo "========== RESTARTING FRONTEND SERVER =========="

# Navigate to the project root directory
cd "$(dirname "$0")"
PROJECT_ROOT=$(pwd)

# Go to frontend directory
cd "$PROJECT_ROOT/frontend"

# Check if we're in the correct directory
if [ ! -f "package.json" ]; then
  echo "Error: No package.json found in frontend directory!"
  exit 1
fi

# Kill any running frontend server
echo "Stopping any running frontend processes..."
pkill -f "npm run dev" || true
echo "All frontend processes stopped."
echo ""

# Install dependencies if needed
echo "Checking dependencies..."
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
  echo "Dependencies installed."
else
  echo "Dependencies already installed."
fi
echo ""

# Start the frontend server
echo "Starting frontend development server..."
npm run dev &
FRONTEND_PID=$!
echo "Frontend server started with PID: $FRONTEND_PID"
echo ""

echo "Frontend server has been restarted."
echo "You can access the application at: http://localhost:3000"
echo ""
echo "========== FRONTEND RESTART COMPLETE =========="

# Return to the project root
cd "$PROJECT_ROOT"
