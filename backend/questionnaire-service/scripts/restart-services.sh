#!/bin/bash

# Restart Services with Enhanced Connectivity Fix
# This script applies the enhanced connectivity fix and restarts affected services

echo "Applying enhanced connectivity fix and restarting services..."

# Navigate to questionnaire service directory
cd "$(dirname "$0")/.."

# Apply the enhanced connectivity fix
echo "Running enhanced connectivity fix..."
node scripts/enhanced-connectivity-fix.js

# Check exit status of the fix script
if [ $? -ne 0 ]; then
    echo "Error: Enhanced connectivity fix script failed."
    exit 1
fi

# Restart questionnaire service via docker-compose
echo "Restarting questionnaire service..."
cd ../../../
docker-compose restart questionnaire-service

# Wait a moment for the service to fully start
echo "Waiting for service to initialize..."
sleep 5

# Verify service is running correctly
echo "Verifying service health..."
curl -s http://localhost:3002/health | grep -q '"status":"ok"'

if [ $? -eq 0 ]; then
    echo "✅ Questionnaire service restarted successfully with enhanced connectivity fix"
    echo "Connection issues should now be resolved"
else
    echo "⚠️ Questionnaire service may not be fully operational yet"
    echo "Please check service logs with: docker-compose logs questionnaire-service"
fi

echo ""
echo "To verify the fix is working properly, you can run:"
echo "node backend/questionnaire-service/scripts/diagnose-fix.js"
echo ""
