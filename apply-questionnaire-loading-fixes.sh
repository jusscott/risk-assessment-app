#!/bin/bash
set -e

echo "Applying questionnaire loading fixes..."

# Run the fix script
node fix-questionnaire-loading-issues-fix.js

# Restart the questionnaire service
echo "Restarting questionnaire service..."

# If running in Docker
if [ -n "$(docker ps | grep questionnaire-service)" ]; then
    echo "Restarting questionnaire service in Docker..."
    docker restart questionnaire-service
else
    # Restart using npm if not in Docker
    echo "Restarting questionnaire service locally..."
    cd backend/questionnaire-service
    npm run dev &
    cd ../..
fi

echo "Fixes applied and service restarted."
echo "Please verify that you can now load draft, submitted, and finished questionnaires."
