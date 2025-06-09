#!/bin/sh

# Create a script to handle startup tasks for questionnaire-service

# Ensure the script fails on any error
set -e

# Output environment information for debugging
echo "Starting questionnaire-service with environment: ${NODE_ENV}"
echo "Auth service URL: ${AUTH_SERVICE_URL}"

# Install critical dependencies to ensure they're available
# This addresses potential issues with Docker layer caching or failed installations
echo "Ensuring critical dependencies are installed..."
npm install axios@1.4.0 axios-retry@3.3.1 opossum@6.4.0 --no-save --no-audit --loglevel=error || true

# Load environment variables from .env files based on NODE_ENV
if [ -f ".env.${NODE_ENV}" ]; then
  echo "Loading environment variables from .env.${NODE_ENV}..."
  export $(grep -v '^#' .env.${NODE_ENV} | xargs)
fi

# Run migrations to ensure database schema is in place
echo "Running database migrations..."
npx prisma migrate deploy

echo "Generating Prisma client..."
npx prisma generate

# Seed the database with initial data
echo "Seeding database with initial data..."
npm run seed || true

# Start the service
echo "Starting questionnaire service on port ${PORT:-5002}..."
# Start as a background process so we can run the seed-frameworks afterwards
node src/index.js &

# Store the process ID
SERVICE_PID=$!

# Add wait-for-it logic to ensure service is fully started before seeding
echo "Waiting for service to fully start before loading framework templates..."
# Try to ping the service until it responds
ATTEMPTS=0
MAX_ATTEMPTS=30
SERVICE_READY=false

while [ $ATTEMPTS -lt $MAX_ATTEMPTS ] && [ "$SERVICE_READY" != "true" ]
do
  ATTEMPTS=$((ATTEMPTS+1))
  echo "Checking if service is ready (attempt $ATTEMPTS/$MAX_ATTEMPTS)..."
  
  if curl -s http://localhost:5002/health > /dev/null; then
    SERVICE_READY=true
    echo "Service is up and running!"
  else
    echo "Service not ready yet, waiting..."
    sleep 2
  fi
done

if [ "$SERVICE_READY" = "true" ]; then
  echo "Ensuring all framework templates are properly loaded..."
  npm run seed-frameworks || echo "Note: Seed frameworks returned non-zero exit code, but this may be normal"
else
  echo "WARNING: Service did not start in time, skipping framework seeding"
fi
wait $SERVICE_PID
