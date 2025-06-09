#!/bin/bash

# Set colors for terminal output
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}===== PREPARING PLANS FIX SCRIPT =====${NC}"

# Navigate to the payment service directory
cd "$(dirname "$0")/.."

# Install required dependencies
echo -e "${CYAN}Installing required dependencies...${NC}"
npm install axios --save

# Make the script executable
echo -e "${CYAN}Making script executable...${NC}"
chmod +x ./scripts/activate-plans-api.js

echo -e "${GREEN}✓ Preparation complete. You can now run:${NC}"
echo -e "  node ./scripts/activate-plans-api.js"
echo ""
echo -e "${YELLOW}NOTE: Ensure the payment service is running before executing the script.${NC}"
