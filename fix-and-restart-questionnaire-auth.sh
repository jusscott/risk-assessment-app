#!/bin/bash
# Combined script to apply all auth circuit breaker fixes and restart services

echo "=== AUTH SERVICE CIRCUIT BREAKER FIX ==="
echo "This script will apply fixes to make the questionnaire service resilient"
echo "to auth service failures by implementing proper circuit breaker patterns."
echo ""

# Step 1: Apply all fixes
echo "Step 1: Applying all fixes..."
bash apply-auth-circuit-breaker-fix.sh
if [ $? -ne 0 ]; then
  echo "Error: Failed to apply fixes"
  exit 1
fi

# Step 2: Make scripts executable
echo "Step 2: Making restart scripts executable..."
chmod +x restart-for-circuit-breaker-fix.sh
if [ $? -ne 0 ]; then
  echo "Error: Failed to make restart script executable"
  exit 1
fi

# Step 3: Restart services
echo "Step 3: Restarting services to apply changes..."
./restart-for-circuit-breaker-fix.sh
if [ $? -ne 0 ]; then
  echo "Error: Failed to restart services"
  exit 1
fi

echo ""
echo "=== FIX SUCCESSFULLY APPLIED ==="
echo "The auth circuit breaker fix has been applied successfully."
echo "You can test the resilience by:"
echo "1. Stop the auth service: docker-compose stop auth-service"
echo "2. Access questionnaires in the frontend (should still work)"
echo "3. Start the auth service: docker-compose start auth-service"
echo "4. Verify normal operation resumes"
