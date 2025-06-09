#!/bin/bash
# Script to apply the real user authentication consistency fix and restart the questionnaire service

echo "=== Applying Real User Authentication Consistency Fix ==="
echo "This will fix the issue with real users retrieving questionnaires in development environments"

# Execute the fix script
echo "Running fix script..."
node fix-real-user-auth-consistency.js

if [ $? -ne 0 ]; then
  echo "Error: Fix script failed. Check the logs above for details."
  exit 1
fi

# Restart questionnaire service
echo -e "\nRestarting questionnaire service to apply changes..."
if [ -f "restart-questionnaire-service.sh" ]; then
  bash restart-questionnaire-service.sh
else
  # Fallback if dedicated restart script doesn't exist
  docker-compose restart questionnaire-service
fi

echo -e "\n=== Fix Summary ==="
echo "1. Fixed authentication middleware to better handle real user tokens"
echo "2. Improved user ID consistency (always converting to strings)"
echo "3. Added special handling for questionnaire endpoints in development"
echo "4. Enhanced fallback validation for auth service unavailability"
echo "5. Added detailed debugging for authentication issues"
echo ""
echo "You should now be able to retrieve questionnaires using real user credentials in the development environment."
echo "If issues persist, check the questionnaire service logs using: docker-compose logs -f questionnaire-service"
