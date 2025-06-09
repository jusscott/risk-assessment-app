#!/bin/bash

# Color codes for better readability
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}==================================================${NC}"
echo -e "${BLUE}   QUESTIONNAIRE TEMPLATE ISSUES REPAIR SCRIPT    ${NC}"
echo -e "${BLUE}==================================================${NC}"
echo

# Make sure we're in the questionnaire service directory
if [[ $(basename "$PWD") != "questionnaire-service" ]]; then
  if [[ -d "backend/questionnaire-service" ]]; then
    echo -e "${YELLOW}Changing to questionnaire-service directory...${NC}"
    cd backend/questionnaire-service
  elif [[ -d "questionnaire-service" ]]; then
    echo -e "${YELLOW}Changing to questionnaire-service directory...${NC}"
    cd questionnaire-service
  else
    echo -e "${RED}Error: This script should be run from the questionnaire-service directory or its parent.${NC}"
    echo -e "${RED}Current directory: $(pwd)${NC}"
    exit 1
  fi
fi

# Check if node is available
if ! command -v node &> /dev/null; then
  echo -e "${RED}Error: Node.js is not installed or not in the PATH.${NC}"
  echo -e "${YELLOW}Please install Node.js or make sure it's in your PATH.${NC}"
  exit 1
fi

# Check if npm is available
if ! command -v npm &> /dev/null; then
  echo -e "${RED}Error: npm is not installed or not in the PATH.${NC}"
  echo -e "${YELLOW}Please install npm or make sure it's in your PATH.${NC}"
  exit 1
fi

# Make sure node-fetch is installed
echo -e "${BLUE}Checking dependencies...${NC}"
if ! npm list node-fetch 2>/dev/null | grep -q 'node-fetch'; then
  echo -e "${YELLOW}Installing node-fetch dependency...${NC}"
  npm install node-fetch@2 --no-save
fi

# Check if database connection fix is needed first
echo -e "${BLUE}Checking for database connection issues...${NC}"
echo -e "${YELLOW}This will ensure the database is properly configured before fixing templates.${NC}"
echo

# Run the database fix script first
node scripts/fix-database-connection.js
DB_FIX_STATUS=$?

if [ $DB_FIX_STATUS -ne 0 ]; then
  echo -e "${RED}Database connection could not be established automatically.${NC}"
  echo -e "${YELLOW}Please review the output above and fix the database connection issue manually.${NC}"
  echo -e "${YELLOW}Once database connection is working, run this script again.${NC}"
  exit 1
fi

# Run the template diagnostic script
echo -e "${GREEN}Running template diagnosis and fix script...${NC}"
echo -e "${YELLOW}This may take a moment. Please wait...${NC}"
echo

node scripts/diagnose-and-fix-templates.js

# Check if the script ran successfully
if [ $? -eq 0 ]; then
  echo
  echo -e "${GREEN}==================================================${NC}"
  echo -e "${GREEN}   Diagnosis and fix completed successfully!      ${NC}"
  echo -e "${GREEN}==================================================${NC}"
  echo -e "${YELLOW}If you're still experiencing issues with questionnaire templates:${NC}"
  echo -e "1. Check that the database connection is working properly"
  echo -e "2. Verify that all services (especially questionnaire-service) are running"
  echo -e "3. Check the logs for more detailed error messages"
  echo -e "4. Restart the application services using: ${BLUE}docker-compose restart${NC}"
  echo
else
  echo
  echo -e "${RED}==================================================${NC}"
  echo -e "${RED}   The diagnosis script encountered errors        ${NC}"
  echo -e "${RED}==================================================${NC}"
  echo -e "${YELLOW}Please check the output above for error details.${NC}"
  echo -e "You may need to manually check:"
  echo -e "1. Database connectivity issues"
  echo -e "2. Network/DNS resolution problems"
  echo -e "3. File permission issues"
  echo -e "4. Service availability"
  echo
fi

echo -e "${BLUE}Done.${NC}"
