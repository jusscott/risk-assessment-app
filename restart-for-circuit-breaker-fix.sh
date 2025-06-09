#!/bin/bash
echo "Restarting services for circuit breaker fix..."

# Restart auth service first
echo "Restarting auth service..."
docker-compose restart auth-service

# Wait for auth service to be fully up
echo "Waiting for auth service to initialize..."
sleep 5

# Restart questionnaire service
echo "Restarting questionnaire service..."
docker-compose restart questionnaire-service

echo "Services restarted successfully."
