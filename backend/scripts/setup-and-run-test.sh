#!/bin/bash
# Setup and Run Report Generation Test
# This script installs necessary dependencies and runs the report generation test

# Colors for better output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
RESET='\033[0m'

# Banner
echo -e "${BLUE}====================================================="
echo -e " SETUP AND RUN REPORT GENERATION TEST"
echo -e "=====================================================${RESET}"
echo

# Current directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR"

# Step 1: Install required dependencies
echo -e "${BLUE}Step 1: Installing required dependencies...${RESET}"
npm install

if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to install dependencies. Exiting.${RESET}"
    exit 1
else
    echo -e "${GREEN}Dependencies installed successfully!${RESET}"
fi

# Step 2: Run the test script
echo -e "\n${BLUE}Step 2: Running test script...${RESET}"
./run-report-test.sh

# Check exit status
if [ $? -ne 0 ]; then
    echo -e "${RED}Test script failed. Please check the error messages above.${RESET}"
    exit 1
else
    echo -e "${GREEN}Test completed successfully!${RESET}"
fi
