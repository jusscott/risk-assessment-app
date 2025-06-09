#!/bin/bash

# Copy the script to the container
echo "📋 Copying test submissions script to questionnaire-service container..."
docker cp risk-assessment-app/create-test-submissions.js questionnaire-service:/app/create-test-submissions.js

if [ $? -ne 0 ]; then
  echo "❌ Failed to copy script to container"
  exit 1
fi

# Execute the script in the container
echo "🚀 Running test submissions script in container..."
docker-compose exec -T questionnaire-service node create-test-submissions.js

if [ $? -ne 0 ]; then
  echo "❌ Failed to run script in container"
  exit 1
fi

echo "✅ Script execution completed"
