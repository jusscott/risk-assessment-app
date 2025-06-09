#!/bin/bash
# Apply Redis configuration fix to API Gateway and restart the service

echo "======================================================="
echo "Applying Redis connection fix to API Gateway..."
echo "======================================================="

# Run the Redis fix script
node fix-api-gateway-redis.js

# Check if the fix was successful
if [ $? -eq 0 ]; then
  echo "Redis configuration fix applied successfully."
else
  echo "Error: Failed to apply Redis configuration fix."
  exit 1
fi

echo ""
echo "======================================================="
echo "Restarting API Gateway service..."
echo "======================================================="

# Check if the restart script exists and run it
if [ -f "./restart-api-gateway.sh" ]; then
  echo "Using existing restart script..."
  chmod +x ./restart-api-gateway.sh
  ./restart-api-gateway.sh
else
  # Fallback restart logic if the script doesn't exist
  echo "Restart script not found. Using fallback restart method..."
  
  # Assuming we're using Docker Compose for the services
  echo "Restarting API Gateway container..."
  docker-compose restart api-gateway
  
  if [ $? -eq 0 ]; then
    echo "API Gateway service restarted successfully."
  else
    echo "Error: Failed to restart API Gateway service."
    exit 1
  fi
fi

echo ""
echo "======================================================="
echo "Redis connection fix has been applied!"
echo "======================================================="
echo ""
echo "The system will now use in-memory cache as fallback when Redis is unavailable."
echo "This ensures that authentication endpoints remain functional even during Redis connection issues."
echo ""
echo "To verify the fix, run: node verify-api-gateway-fix.js"
echo ""
