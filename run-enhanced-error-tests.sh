#!/bin/bash

# Run enhanced error scenarios tests
echo "Running enhanced error scenarios tests..."
cd "$(dirname "$0")"
node tests/integration/run-enhanced-error-scenarios-tests.js "$@"
