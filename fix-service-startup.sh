#!/bin/bash

# Script to fix service startup issues
# Resets circuit breakers and ensures services start properly

echo "========== SERVICE STARTUP FIX SCRIPT =========="
echo "This script will reset circuit breakers and restart services to fix startup issues."
echo ""

# Navigate to the project root directory
cd "$(dirname "$0")"
PROJECT_ROOT=$(pwd)

# Define colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Step 1: Running circuit breaker reset script...${NC}"
node reset-circuit-breakers.js

echo ""
echo -e "${YELLOW}Step 2: Forcefully terminating any stuck processes...${NC}"

# Find and kill processes by service name
kill_service_processes() {
  local SERVICE=$1
  local PIDS=$(ps aux | grep -i "$SERVICE" | grep -v grep | awk '{print $2}')
  
  if [ -n "$PIDS" ]; then
    echo "Found $SERVICE processes: $PIDS"
    for PID in $PIDS; do
      echo "Killing process $PID..."
      kill -9 $PID 2>/dev/null || echo "Process $PID already terminated"
    done
    echo -e "${GREEN}All $SERVICE processes terminated.${NC}"
  else
    echo "No $SERVICE processes found running."
  fi
}

# Kill any potentially stuck service processes
SERVICES=("api-gateway" "auth-service" "questionnaire-service" "analysis-service" "report-service" "payment-service" "circuit-breaker")
for SERVICE in "${SERVICES[@]}"; do
  kill_service_processes $SERVICE
done

echo ""
echo -e "${YELLOW}Step 3: Checking Docker container status...${NC}"
docker ps

echo ""
echo -e "${YELLOW}Step 4: Waiting for services to stabilize...${NC}"
# Sleep to give services time to stabilize
sleep 10

echo ""
echo -e "${YELLOW}Step 5: Checking service health...${NC}"
# Check API Gateway health as it's the entry point
echo "Checking API Gateway health..."
GATEWAY_HEALTH=$(curl -s http://localhost:5000/health || echo "Failed")

if [[ "$GATEWAY_HEALTH" == *"healthy"* ]]; then
  echo -e "${GREEN}API Gateway is healthy!${NC}"
elif [[ "$GATEWAY_HEALTH" != "Failed" ]]; then
  echo -e "${YELLOW}API Gateway responded, but status may not be healthy:${NC}"
  echo "$GATEWAY_HEALTH" | head -10
else
  echo -e "${RED}Could not connect to API Gateway health endpoint.${NC}"
  echo "The service might still be starting up or there might be an issue."
fi

echo ""
echo -e "${YELLOW}Step 6: Docker container status after fixes...${NC}"
docker ps

echo ""
echo -e "${GREEN}========== SERVICE STARTUP FIX COMPLETE ==========${NC}"
echo -e "All fixes have been applied. If services are still not starting, please:"
echo -e "1. Check each service's logs with: docker-compose logs [service-name]"
echo -e "2. Run specific service restart: docker-compose restart [service-name]"
echo -e "3. Check if database migrations need to be applied for each service"
echo -e ""
echo -e "For API Gateway issues: ./fix-api-gateway.sh"
echo -e "For frontend issues: ./restart-frontend.sh"
echo -e ""
echo -e "To check if services are now working, try accessing the application in your browser."
