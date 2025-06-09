#!/bin/bash

# Test script for Risk Assessment Application
# This script will start all services and verify they are working correctly

echo "=== Risk Assessment App Testing Script ==="
echo ""

# Color definitions for better readability
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if a service is responding
check_service() {
  local service_name=$1
  local url=$2
  local expected_status=$3
  
  echo -e "${YELLOW}Testing $service_name at $url${NC}"
  
  # Try up to 5 times with a 2-second delay between attempts
  for i in {1..5}; do
    response=$(curl -s -o /dev/null -w "%{http_code}" $url)
    
    if [ "$response" = "$expected_status" ]; then
      echo -e "${GREEN}✓ $service_name is running (Status: $response)${NC}"
      return 0
    else
      echo "Attempt $i: $service_name returned status $response, expected $expected_status. Retrying in 2 seconds..."
      sleep 2
    fi
  done
  
  echo -e "${RED}✗ $service_name is not responding correctly (Status: $response, Expected: $expected_status)${NC}"
  return 1
}

# Function to stop all running containers
stop_all_containers() {
  echo "Stopping all running containers..."
  docker-compose down
  sleep 2
}

# Function to start all services
start_all_services() {
  echo "Starting all services with docker-compose..."
  docker-compose up -d
  
  # Wait for services to start up
  echo "Waiting for services to start up (30 seconds)..."
  sleep 30
}

# Main testing process
main() {
  # Step 1: Stop any running containers
  stop_all_containers
  
  # Step 2: Start all services
  start_all_services
  
  # Step 3: Check if each service is responding
  echo ""
  echo "=== Testing Service Connectivity ==="
  
  # Check API Gateway
  check_service "API Gateway" "http://localhost:5000/health" "200"
  api_gateway_status=$?
  
  # If API Gateway is not responding, no point in testing other services through it
  if [ $api_gateway_status -ne 0 ]; then
    echo -e "${RED}API Gateway is not responding. Cannot test other services.${NC}"
    return 1
  fi
  
  # Check Auth Service via API Gateway
  check_service "Auth Service (via API Gateway)" "http://localhost:5000/api/auth/health" "200"
  
  # Check Questionnaire Service via direct access instead of API Gateway
  check_service "Questionnaire Service (direct)" "http://localhost:5002/health" "200"
  
  # Check Payment Service via direct access instead of API Gateway to avoid auth
  check_service "Payment Service (direct)" "http://localhost:5003/health" "200"
  
  # Check Analysis Service via direct access 
  check_service "Analysis Service (direct)" "http://localhost:5004/health" "200"
  
  # Check Report Service via direct access
  check_service "Report Service (direct)" "http://localhost:5005/health" "200"
  
  # Check Frontend
  check_service "Frontend" "http://localhost:3000" "200"
  
  # Step 4: Test basic API functionality
  echo ""
  echo "=== Testing API Functionality ==="
  
  # Test user registration (this will fail if user already exists, which is fine)
  echo -e "${YELLOW}Testing User Registration API${NC}"
  register_response=$(curl -s -X POST -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"Password123!","name":"Test User"}' \
    http://localhost:5000/api/auth/register)
  
  echo "Registration Response: $register_response"
  
  # Test user login
  echo -e "${YELLOW}Testing User Login API${NC}"
  login_response=$(curl -s -X POST -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"Password123!"}' \
    http://localhost:5000/api/auth/login)
  
  echo "Login Response: $login_response"
  
  # Extract token from login response
  token=$(echo $login_response | grep -o '"token":"[^"]*' | cut -d'"' -f4)
  
  if [ -z "$token" ]; then
    echo -e "${RED}Failed to get authentication token${NC}"
  else
    echo -e "${GREEN}Successfully obtained authentication token${NC}"
    
    # Test authenticated endpoints
    echo -e "${YELLOW}Testing Authenticated Endpoint${NC}"
    auth_response=$(curl -s -H "Authorization: Bearer $token" http://localhost:5000/api/auth/profile)
    echo "Authenticated Response: $auth_response"
  fi
  
  echo ""
  echo "=== Testing Complete ==="
}

# Run the main testing process
main

echo ""
echo "To view service logs, use: docker-compose logs [service-name]"
echo "To restart a specific service, use: docker-compose restart [service-name]"
echo "To interact with the frontend, open: http://localhost:3000 in your browser"
