#!/bin/bash

# Run Parallel Integration Tests for Risk Assessment App
# This script executes the parallel test runner with appropriate options

# Color definitions
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Constants
TESTS_DIR="./tests/integration"
# macOS-compatible CPU detection
if command -v nproc &> /dev/null; then
    DEFAULT_CONCURRENCY=$(nproc --ignore=1) # Number of CPUs minus 1, or at least 1
else
    # For macOS, use sysctl to get CPU count
    DEFAULT_CONCURRENCY=$(sysctl -n hw.ncpu 2>/dev/null || echo 2)
    # Subtract 1 but ensure minimum of 1
    DEFAULT_CONCURRENCY=$((DEFAULT_CONCURRENCY > 1 ? DEFAULT_CONCURRENCY - 1 : 1))
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed. Please install Node.js to run the tests.${NC}"
    exit 1
fi

# Process command line arguments
SUITE=""
CONCURRENCY=$DEFAULT_CONCURRENCY
INSTALL=false
STOP_SERVICES=false

for arg in "$@"
do
    case $arg in
        --suite=*)
            SUITE="${arg#*=}"
            ;;
        --concurrency=*)
            CONCURRENCY="${arg#*=}"
            ;;
        --install)
            INSTALL=true
            ;;
        --stop-services)
            STOP_SERVICES=true
            ;;
        --help)
            echo -e "${BLUE}Parallel Integration Test Runner for Risk Assessment App${NC}"
            echo ""
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --suite=SUITE       Run specific test suite (e.g., health, auth, questionnaire, etc.)"
            echo "  --concurrency=N     Maximum number of tests to run in parallel (default: $DEFAULT_CONCURRENCY)"
            echo "  --install           Install dependencies before running tests"
            echo "  --stop-services     Stop services after tests complete"
            echo "  --help              Show this help message"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $arg${NC}"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

echo -e "${BLUE}=====================================================${NC}"
echo -e "${BLUE}Risk Assessment App - Parallel Integration Tests${NC}"
echo -e "${BLUE}=====================================================${NC}"

# Check if Docker is running
echo -e "${YELLOW}Checking if Docker is running...${NC}"
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Docker is not running or not installed.${NC}"
    echo -e "${RED}Please start Docker before running integration tests.${NC}"
    exit 1
fi
echo -e "${GREEN}Docker is running.${NC}"

# Ensure test directory exists
if [ ! -d "$TESTS_DIR" ]; then
    echo -e "${RED}Error: Test directory '$TESTS_DIR' not found.${NC}"
    exit 1
fi

# Make parallel-runner.js executable if it exists
PARALLEL_RUNNER="$TESTS_DIR/parallel-runner.js"
if [ -f "$PARALLEL_RUNNER" ]; then
    chmod +x "$PARALLEL_RUNNER"
else
    echo -e "${RED}Error: Parallel test runner script not found at '$PARALLEL_RUNNER'.${NC}"
    exit 1
fi

# Install dependencies if requested
if [ "$INSTALL" = true ]; then
    echo -e "${YELLOW}Installing test dependencies...${NC}"
    cd "$TESTS_DIR" && npm install
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}Error: Failed to install test dependencies.${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}Dependencies installed successfully.${NC}"
    cd - > /dev/null
fi

# Build command line arguments for the parallel runner
ARGS=""

if [ -n "$SUITE" ]; then
    ARGS="$ARGS --suite=$SUITE"
fi

if [ -n "$CONCURRENCY" ]; then
    ARGS="$ARGS --concurrency=$CONCURRENCY"
fi

if [ "$STOP_SERVICES" = true ]; then
    ARGS="$ARGS --cleanup"
fi

# Run the parallel test runner
echo -e "${YELLOW}Running parallel integration tests with concurrency $CONCURRENCY...${NC}"
echo -e "${YELLOW}(Test output will appear below)${NC}"
echo ""

node "$PARALLEL_RUNNER" $ARGS

# Capture the exit code
EXIT_CODE=$?

# Print summary based on exit code
echo ""
if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}All tests passed successfully!${NC}"
else
    echo -e "${RED}Some tests failed. See above for details.${NC}"
fi

exit $EXIT_CODE
