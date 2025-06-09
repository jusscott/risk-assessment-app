#!/bin/bash
# Script to diagnose questionnaire service issues

echo "================================================="
echo "QUESTIONNAIRE SERVICE DIAGNOSTIC"
echo "================================================="
echo

# Check if questionnaire service container is running
echo "Checking questionnaire service container status..."
CONTAINER_ID=$(docker-compose ps -q questionnaire-service)

if [ -z "$CONTAINER_ID" ]; then
  echo "❌ Questionnaire service container is not running!"
  echo "Try starting it with: docker-compose up -d questionnaire-service"
else
  echo "✅ Questionnaire service container is running (ID: $CONTAINER_ID)"
  
  # Get container status
  echo
  echo "Container details:"
  docker inspect --format='Status: {{.State.Status}}
Started: {{.State.StartedAt}}
Health: {{if .State.Health}}{{.State.Health.Status}}{{else}}N/A{{end}}
Restart Count: {{.RestartCount}}
' $CONTAINER_ID
  
  # Check if container is restarting
  RESTART_COUNT=$(docker inspect --format='{{.RestartCount}}' $CONTAINER_ID)
  if [ $RESTART_COUNT -gt 2 ]; then
    echo "⚠️  Warning: Container has restarted $RESTART_COUNT times - might be in restart loop!"
  fi
  
  # Check logs
  echo
  echo "Recent logs (last 20 lines):"
  docker logs --tail 20 $CONTAINER_ID
  
  # Check for specific error patterns
  echo
  echo "Checking for specific error patterns..."
  ERRORS=$(docker logs $CONTAINER_ID 2>&1 | grep -i -E "Error|Exception|Failed|Cannot|Unable|Module not found" | tail -10)
  
  if [ -n "$ERRORS" ]; then
    echo "Found potential errors:"
    echo "$ERRORS"
  else
    echo "No obvious errors found in recent logs."
  fi
  
  # Check if API is responding
  echo
  echo "Testing API health endpoint..."
  docker-compose exec -T questionnaire-service curl -s http://localhost:5002/health > /dev/null
  if [ $? -eq 0 ]; then
    echo "✅ Health endpoint is responding"
  else
    echo "❌ Health endpoint is not responding"
  fi
fi

# Check enhanced client wrapper file
echo
echo "Checking enhanced client wrapper..."
if [ -f "backend/questionnaire-service/src/utils/enhanced-client-wrapper.js" ]; then
  echo "✅ Enhanced client wrapper file exists"
else
  echo "❌ Enhanced client wrapper file missing!"
fi

# Check circuit breaker settings in .env
echo
echo "Checking circuit breaker config in .env..."
if [ -f "backend/questionnaire-service/.env" ]; then
  CIRCUIT_SETTING=$(grep "CIRCUIT_BREAKER" backend/questionnaire-service/.env)
  if [ -n "$CIRCUIT_SETTING" ]; then
    echo "Circuit breaker setting found: $CIRCUIT_SETTING"
  else
    echo "No circuit breaker setting found in .env"
  fi
else
  echo "❌ .env file missing!"
fi

# Suggest next steps
echo
echo "================================================="
echo "DIAGNOSTIC COMPLETE"
echo "================================================="
echo
echo "Suggested actions:"
echo "1. If container is in restart loop, try running: node risk-assessment-app/fix-questionnaire-service-restart-issue.js"
echo "2. Then run: ./restart-questionnaire-service-fixed.sh"
echo "3. If issues persist, check Docker logs with: docker-compose logs questionnaire-service"
echo "4. Verify enhanced client wrapper setup with: cat backend/questionnaire-service/src/utils/enhanced-client-wrapper.js"
echo
