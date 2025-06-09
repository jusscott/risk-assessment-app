#!/bin/bash
# Master script to apply auth service circuit breaker improvements
# This script fixes the issue where the questionnaire service fails when the auth service is down
# by implementing proper circuit breaker patterns and fallback authentication.

echo "=================================="
echo "QUESTIONNAIRE AUTH RESILIENCE FIX"
echo "=================================="
echo ""
echo "This script will:"
echo "1. Apply circuit breaker improvements to questionnaire auth"
echo "2. Configure consistent JWT secrets across services"
echo "3. Add local token validation as fallback"
echo "4. Add proper circuit breaker event handling"
echo "5. Restart necessary services"
echo ""
read -p "Press Enter to continue or Ctrl+C to cancel..."

# Make all scripts executable
echo "Making scripts executable..."
chmod +x apply-auth-circuit-breaker-fix.sh
chmod +x restart-for-circuit-breaker-fix.sh
chmod +x fix-and-restart-questionnaire-auth.sh

# Apply the fixes with our main script
echo "Running fix and restart script..."
./fix-and-restart-questionnaire-auth.sh

echo ""
echo "================================="
echo "AUTH CIRCUIT BREAKER FIX COMPLETE"
echo "================================="
echo ""
echo "The questionnaire service can now function properly during auth service outages."
echo "You can test this by:"
echo "1. docker-compose stop auth-service"
echo "2. Verify questionnaire service continues to work"
echo "3. docker-compose start auth-service"
echo "4. Verify everything returns to normal operation"
echo ""
echo "See circuit-breaker-auth-fix-summary.md for technical details."
echo ""
