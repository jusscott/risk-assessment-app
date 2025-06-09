#!/bin/bash
# Run Report Generation Test
# This script automates setting up the mock environment and running the report generation test

# Colors for better output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
RESET='\033[0m'

# Banner
echo -e "${BLUE}====================================================="
echo -e " REPORT GENERATION TEST - DEVELOPMENT ENVIRONMENT"
echo -e "=====================================================${RESET}"
echo

# Current directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR"

# Check for required dependencies
echo -e "${BLUE}Checking for required dependencies...${RESET}"

# Function to check if a Node.js package is installed
check_package() {
  if node -e "try { require('$1'); console.log(true); } catch(e) { console.log(false); }" | grep -q "false"; then
    return 1
  else
    return 0
  fi
}

# Install missing dependencies
MISSING_DEPS=false

if ! check_package "uuid"; then
  echo -e "${YELLOW}uuid package not found. Installing...${RESET}"
  npm install uuid
  if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to install uuid. Please run 'npm install uuid' manually.${RESET}"
    MISSING_DEPS=true
  fi
fi

if ! check_package "axios"; then
  echo -e "${YELLOW}axios package not found. Installing...${RESET}"
  npm install axios
  if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to install axios. Please run 'npm install axios' manually.${RESET}"
    MISSING_DEPS=true
  fi
fi

if [ "$MISSING_DEPS" = true ]; then
  echo -e "${RED}Missing dependencies. Please install them and try again.${RESET}"
  exit 1
else
  echo -e "${GREEN}All required dependencies are installed.${RESET}"
fi

# Step 1: Set up mock environment
echo -e "${BLUE}Step 1: Setting up mock environment...${RESET}"

# Check if mock-env-setup.js exists
if [ -f "$SCRIPT_DIR/../questionnaire-service/scripts/mock-env-setup.js" ]; then
    node "$SCRIPT_DIR/../questionnaire-service/scripts/mock-env-setup.js"
    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to set up mock environment. Exiting.${RESET}"
        exit 1
    fi
    echo -e "${GREEN}Mock environment set up successfully!${RESET}"
else
    echo -e "${YELLOW}Warning: mock-env-setup.js not found, continuing anyway...${RESET}"
fi

# Step 2: Bypass database checks
echo -e "\n${BLUE}Step 2: Ensuring database checks are bypassed...${RESET}"
if [ -f "$SCRIPT_DIR/../questionnaire-service/scripts/bypass-db-check.js" ]; then
    node "$SCRIPT_DIR/../questionnaire-service/scripts/bypass-db-check.js"
    if [ $? -ne 0 ]; then
        echo -e "${YELLOW}Warning: Could not bypass database checks, but will continue...${RESET}"
    else
        echo -e "${GREEN}Database checks successfully bypassed.${RESET}"
    fi
else
    echo -e "${YELLOW}Warning: bypass-db-check.js not found, continuing anyway...${RESET}"
fi

# Step 3: Run the report generation test
echo -e "\n${BLUE}Step 3: Running report generation test...${RESET}"
node "$SCRIPT_DIR/test-report-generation-dev.js"

# Check exit status
if [ $? -ne 0 ]; then
    echo -e "${RED}Report generation test failed.${RESET}"
    exit 1
else
    echo -e "${GREEN}Report generation test completed successfully!${RESET}"
fi

echo -e "\n${GREEN}======================================================="
echo -e " TEST COMPLETED - Check logs for detailed results"
echo -e "=======================================================${RESET}"
