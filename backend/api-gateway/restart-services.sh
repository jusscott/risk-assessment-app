#!/bin/bash

echo "=== RESTARTING CRITICAL SERVICES ==="
echo "Addressing service startup and routing issues"

# Wait for services to be ready for restart
echo "Waiting for Docker containers to be ready..."
sleep 2

# Restart auth service first (other services depend on it)
echo "Restarting auth-service..."
docker-compose restart auth-service
sleep 5

# Restart questionnaire service 
echo "Restarting questionnaire-service..."
docker-compose restart questionnaire-service
sleep 5

# Restart API Gateway to pick up routing changes
echo "Restarting api-gateway..."
docker-compose restart api-gateway
sleep 5

# Check service status
echo ""
echo "=== SERVICE STATUS CHECK ==="
docker ps | grep risk-assessment | grep -E "(auth-service|questionnaire-service|api-gateway)"

echo ""
echo "=== TESTING CRITICAL ENDPOINTS ==="
echo "Waiting for services to fully start..."
sleep 10

# Test API Gateway health
echo "Testing API Gateway health..."
curl -s http://localhost:5000/health | jq . || echo "API Gateway health check failed"

echo ""
echo "Testing auth service health..."
curl -s http://localhost:5000/api/auth/health | jq . || echo "Auth service health check failed"

echo ""
echo "Testing questionnaire service health..."
curl -s http://localhost:5000/api/questionnaire/health | jq . || echo "Questionnaire service health check failed"

echo ""
echo "=== RESTART COMPLETE ==="
echo "Services should now be accessible with proper routing"
