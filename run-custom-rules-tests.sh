#!/bin/bash

# Run Custom Rules Integration Tests
# This script runs the integration tests for the custom rules feature

echo "Running custom rules integration tests..."

# Run the tests with the parallel runner
node tests/integration/parallel-runner.js --suite custom-rules

# Check the exit code
if [ $? -eq 0 ]; then
  echo "✅ Custom rules integration tests completed successfully"
  exit 0
else
  echo "❌ Custom rules integration tests failed"
  exit 1
fi
