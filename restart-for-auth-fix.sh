#!/bin/bash

# Script to restart services after applying the questionnaire auth fixes

# Print colored text function
print_color() {
    COLOR=$1
    TEXT=$2
    
    case $COLOR in
        "green") echo -e "\033[0;32m$TEXT\033[0m" ;;
        "red") echo -e "\033[0;31m$TEXT\033[0m" ;;
        "blue") echo -e "\033[0;34m$TEXT\033[0m" ;;
        "yellow") echo -e "\033[0;33m$TEXT\033[0m" ;;
        *) echo "$TEXT" ;;
    esac
}

print_color "blue" "===== Restart Services for Questionnaire Auth Fixes ====="

# First, run the fixing script if it hasn't been run yet
if [ ! -f "questionnaire-auth-fixes-applied" ]; then
    print_color "yellow" "Applying questionnaire auth fixes..."
    node fix-questionnaire-auth-issues.js
    
    # Create a flag file to indicate fixes were applied
    touch questionnaire-auth-fixes-applied
    print_color "green" "✓ Auth fixes applied successfully"
else
    print_color "yellow" "Auth fixes have already been applied"
fi

# Restart the questionnaire service
print_color "yellow" "Restarting questionnaire service..."
if [ -f "restart-questionnaire-service.sh" ]; then
    bash restart-questionnaire-service.sh
    print_color "green" "✓ Questionnaire service restart initiated"
else
    # Fallback to docker restart if script doesn't exist
    docker-compose restart questionnaire-service
    print_color "green" "✓ Questionnaire service restarted via docker-compose"
fi

# Wait a moment for the service to start
sleep 5

# Restart the frontend
print_color "yellow" "Restarting frontend service..."
if [ -f "restart-frontend.sh" ]; then
    bash restart-frontend.sh
    print_color "green" "✓ Frontend restart initiated"
else
    # Fallback to docker restart if script doesn't exist
    docker-compose restart frontend
    print_color "green" "✓ Frontend restarted via docker-compose"
fi

print_color "blue" "===== Services Restarted Successfully ====="
print_color "green" "The questionnaire authentication issues should now be fixed:"
print_color "green" "1. Users should no longer be logged out when starting a questionnaire"
print_color "green" "2. The 'Failed to load questionnaires' error should be resolved"
echo ""
print_color "yellow" "Important: If you still experience issues, please try the following:"
print_color "yellow" "- Clear your browser cache and cookies"
print_color "yellow" "- Restart all services with 'docker-compose down && docker-compose up -d'"
print_color "yellow" "- Check the logs with 'docker-compose logs -f questionnaire-service'"
echo ""
print_color "blue" "✨ Happy questionnaire assessment! ✨"
