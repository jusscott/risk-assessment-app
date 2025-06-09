#!/bin/bash

# Restart services after applying the questionnaire-analysis connection fix

echo "Applying questionnaire-analysis connection fix..."
node fix-questionnaire-analysis-issues.js

# Restart the questionnaire service to apply the changes
echo "Restarting questionnaire service..."
docker-compose restart questionnaire-service

# Restart the analysis service to ensure it's running properly
echo "Restarting analysis service..."
docker-compose restart analysis-service

# Wait for services to be fully up
echo "Waiting for services to restart (10 seconds)..."
sleep 10

echo "Services have been restarted. The fix has been applied to address:"
echo "1. The case sensitivity issue with questions field in the submissions controller"
echo "2. Connection issues to the analysis service using the enhanced client pattern"
echo ""
echo "The system should now correctly load questionnaire questions and connect to analysis service."
echo "Please try accessing the in-progress and new questionnaires again through the UI."
