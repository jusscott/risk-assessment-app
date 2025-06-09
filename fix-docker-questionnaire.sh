#!/bin/bash
set -e

echo "Creating temporary directory for fixed files..."
mkdir -p /tmp/questionnaire-fixes

# Copy fixed files
echo "Copying fixed files from local environment..."
cp risk-assessment-app/backend/questionnaire-service/src/middlewares/auth.middleware.js /tmp/questionnaire-fixes/
cp risk-assessment-app/backend/questionnaire-service/src/controllers/template.controller.js /tmp/questionnaire-fixes/

# Copy files into Docker container
echo "Copying files into Docker container..."
docker cp /tmp/questionnaire-fixes/auth.middleware.js questionnaire-service:/app/src/middlewares/
docker cp /tmp/questionnaire-fixes/template.controller.js questionnaire-service:/app/src/controllers/

# Restart container
echo "Restarting questionnaire service container..."
docker restart questionnaire-service

# Clean up
echo "Cleaning up temporary files..."
rm -rf /tmp/questionnaire-fixes

echo "Done! Service should be restarting with fixed files."
