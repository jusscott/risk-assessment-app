#!/bin/bash

# Integration Test Runner for Risk Assessment Application
# This script sets up the environment and runs integration tests

# Color definitions
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Constants
TESTS_DIR="./tests/integration"
LOGS_DIR="./tests/integration/reports"

# Ensure logs directory exists
mkdir -p "$LOGS_DIR"

# Function to show usage
show_usage() {
  echo -e "${BLUE}Risk Assessment App Integration Tests${NC}"
  echo ""
  echo "Usage: $0 [options]"
  echo ""
  echo "Options:"
  echo "  --suite=SUITE     Run specific test suite (e.g. health, auth, questionnaire, etc.)"
  echo "  --install         Install dependencies before running tests"
  echo "  --stop-services   Stop services after tests complete"
  echo "  --help            Show this help message"
  echo ""
  echo "Available test suites:"
  echo "  health            Basic health checks for all services"
  echo "  auth              Authentication service tests"
  echo "  questionnaire     Questionnaire service tests"
  echo "  payment           Payment service tests"
  echo "  analysis          Analysis service tests"
  echo "  report            Report service tests"
  echo "  api-gateway       API Gateway tests"
  echo "  service-interaction  Cross-service interaction tests"
  echo "  user-journey      End-to-end user journey tests"
  echo ""
  echo "Examples:"
  echo "  $0 --install                  # Install dependencies and run all tests"
  echo "  $0 --suite=health             # Run health check tests only"
  echo "  $0 --suite=service-interaction --stop-services  # Run service interaction tests and stop services after"
}

# Process command line arguments
SUITE=""
INSTALL=false
STOP_SERVICES=false

for arg in "$@"
do
  case $arg in
    --suite=*)
      SUITE="${arg#*=}"
      shift
      ;;
    --install)
      INSTALL=true
      shift
      ;;
    --stop-services)
      STOP_SERVICES=true
      shift
      ;;
    --help)
      show_usage
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $arg${NC}"
      show_usage
      exit 1
      ;;
  esac
done

# Function to check if Docker is running
check_docker() {
  echo -e "${YELLOW}Checking if Docker is running...${NC}"
  if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Docker is not running or not installed. Please start Docker before running integration tests.${NC}"
    exit 1
  fi
  echo -e "${GREEN}Docker is running.${NC}"
}

# Function to install dependencies
install_dependencies() {
  echo -e "${YELLOW}Installing test dependencies...${NC}"
  cd "$TESTS_DIR" && npm install
  if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to install test dependencies.${NC}"
    exit 1
  fi
  echo -e "${GREEN}Dependencies installed successfully.${NC}"
  cd - > /dev/null
}

# Function to run the tests
run_tests() {
  echo -e "${YELLOW}Running integration tests...${NC}"
  
  # Build the command
  command="cd $TESTS_DIR && node runner.js"
  
  # Add suite parameter if specified
  if [ -n "$SUITE" ]; then
    command="$command --suite=$SUITE"
  fi
  
  # Add cleanup parameter if specified
  if [ "$STOP_SERVICES" = true ]; then
    command="$command --cleanup"
  fi
  
  # Run the command
  eval $command
  
  # Check exit code
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}Integration tests completed successfully.${NC}"
    return 0
  else
    echo -e "${RED}Integration tests failed.${NC}"
    return 1
  fi
}

# Function to print summary
print_summary() {
  local exit_code=$1
  
  echo ""
  echo -e "${BLUE}=====================================================${NC}"
  echo -e "${BLUE}Integration Test Summary${NC}"
  echo -e "${BLUE}=====================================================${NC}"
  
  if [ $exit_code -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed${NC}"
  else
    echo -e "${RED}✗ Tests failed${NC}"
  fi
  
  echo ""
  echo -e "Test reports saved to: ${YELLOW}$LOGS_DIR${NC}"
  echo -e "${BLUE}=====================================================${NC}"
}

# Main execution
main() {
  # Show banner
  echo -e "${BLUE}=====================================================${NC}"
  echo -e "${BLUE}Risk Assessment App - Integration Tests${NC}"
  echo -e "${BLUE}=====================================================${NC}"
  echo ""
  
  # Check if Docker is running
  check_docker
  
  # Install dependencies if requested
  if [ "$INSTALL" = true ]; then
    install_dependencies
  fi
  
  # Run the tests
  run_tests
  local exit_code=$?
  
  # Print summary
  print_summary $exit_code
  
  # Return the exit code from the tests
  return $exit_code
}

# Execute main function
main
exit $?
