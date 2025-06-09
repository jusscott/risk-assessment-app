#!/bin/bash

# Fix Plan API Script
# This script runs the necessary steps to fix the subscription plans API issue

# Set colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}===== SUBSCRIPTION PLANS API FIX =====${NC}"
echo

# Step 1: Install any missing dependencies
echo -e "${BLUE}Step 1: Installing dependencies...${NC}"
npm install @prisma/client axios
if [ $? -ne 0 ]; then
  echo -e "${RED}Failed to install dependencies${NC}"
  exit 1
fi
echo -e "${GREEN}Dependencies installed successfully${NC}"
echo

# Step 2: Apply the fix
echo -e "${BLUE}Step 2: Applying fix...${NC}"
node apply-plans-fix.js
if [ $? -ne 0 ]; then
  echo -e "${RED}Failed to apply fix${NC}"
  exit 1
fi
echo

# Step 3: Make script executable
echo -e "${BLUE}Step 3: Making verify script executable...${NC}"
chmod +x verify-plans-fix.js
if [ $? -ne 0 ]; then
  echo -e "${YELLOW}Warning: Could not make verification script executable${NC}"
fi
echo -e "${GREEN}Verification script is now executable${NC}"
echo

# Step 4: Restart services
echo -e "${BLUE}Step 4: Restarting services...${NC}"
echo -e "${YELLOW}Note: You need to restart the payment service and API gateway manually${NC}"
echo -e "1. Navigate to payment-service directory: cd ../"
echo -e "2. Restart the payment service: npm run dev"
echo -e "3. In another terminal, navigate to api-gateway: cd ../../api-gateway"
echo -e "4. Restart the API gateway: npm run dev"
echo

# Step 5: Verify the fix
echo -e "${BLUE}Step 5: Verify the fix${NC}"
echo -e "${YELLOW}After restarting the services, run:${NC}"
echo -e "node verify-plans-fix.js"
echo -e "${YELLOW}to verify that the fix is working correctly${NC}"

echo -e "\n${GREEN}Fix process completed! Please restart the services to apply the changes.${NC}"
