#!/bin/bash
# WebSocket Timeout Fix Test Runner
# This script runs the WebSocket timeout test for the Analysis Service

# Set up colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=========================================================${NC}"
echo -e "${YELLOW}        Analysis Service WebSocket Timeout Test           ${NC}"
echo -e "${YELLOW}=========================================================${NC}"

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
SERVICE_DIR="$(dirname "$SCRIPT_DIR")"

# Navigate to the service directory
cd "$SERVICE_DIR"

echo -e "${GREEN}Installing dependencies...${NC}"
npm install jest ws perf_hooks --no-save

# Make sure environment variables are set
export NODE_ENV=test
export PORT=5004
export LOG_LEVEL=info
export WS_KEEP_ALIVE_INTERVAL=5000
export WS_RECONNECT_INTERVAL=1000
export WS_PING_TIMEOUT=2000
export WS_MAX_RECONNECT_DELAY=10000
export REPORT_SERVICE_HOST=localhost
export REPORT_SERVICE_PORT=5050
export REPORT_SERVICE_WS_URL=ws://localhost:5050

echo -e "${GREEN}Running WebSocket timeout tests...${NC}"
echo -e "${YELLOW}This test may take up to 2 minutes to complete${NC}"

# Run the test with Jest
npx jest tests/websocket-timeout-test.js --verbose --runInBand --forceExit

# Check the test result
if [ $? -eq 0 ]; then
    echo -e "${GREEN}=========================================================${NC}"
    echo -e "${GREEN}        WebSocket Timeout Test PASSED!                   ${NC}"
    echo -e "${GREEN}=========================================================${NC}"
    exit 0
else
    echo -e "${RED}=========================================================${NC}"
    echo -e "${RED}        WebSocket Timeout Test FAILED!                   ${NC}"
    echo -e "${RED}=========================================================${NC}"
    exit 1
fi
