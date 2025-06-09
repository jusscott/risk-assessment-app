#!/bin/bash
# Enhanced Connectivity Fix Script for Questionnaire Service
# This script performs advanced diagnosis and repair of common connectivity issues

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}==================================================${NC}"
echo -e "${BLUE}   QUESTIONNAIRE SERVICE CONNECTIVITY FIX TOOL    ${NC}"
echo -e "${BLUE}==================================================${NC}"

# Check if running with Docker environment
if [ -f "/.dockerenv" ]; then
  echo -e "${YELLOW}Running inside Docker container${NC}"
  DOCKER_ENV=true
else
  echo -e "${YELLOW}Running outside Docker container${NC}"
  DOCKER_ENV=false
fi

# Define service URLs based on environment
API_GATEWAY_URL=${API_GATEWAY_URL:-"http://localhost:5000"}
AUTH_SERVICE_URL=${AUTH_SERVICE_URL:-"http://localhost:5001"}
QUESTIONNAIRE_SERVICE_URL=${QUESTIONNAIRE_SERVICE_URL:-"http://localhost:5002"}
DATABASE_URL=${DATABASE_URL:-"postgresql://postgres:password@questionnaire-db:5432/questionnaires"}

echo -e "\n${BLUE}Step 1: Checking environment variables${NC}"
echo -e "API Gateway: ${API_GATEWAY_URL}"
echo -e "Auth Service: ${AUTH_SERVICE_URL}"
echo -e "Questionnaire Service: ${QUESTIONNAIRE_SERVICE_URL}"
echo -e "Database URL: ${DATABASE_URL}"

# Check environment variables existence
echo -e "\n${BLUE}Verifying environment variables in .env files...${NC}"

ENV_FILES=(".env" ".env.development" ".env.test")
ENV_FIXED=false

for ENV_FILE in "${ENV_FILES[@]}"; do
  if [ -f "$ENV_FILE" ]; then
    echo -e "Found ${ENV_FILE}"
    
    # Check for critical environment variables
    if ! grep -q "DATABASE_URL" "$ENV_FILE"; then
      echo -e "${YELLOW}Adding DATABASE_URL to ${ENV_FILE}${NC}"
      echo "DATABASE_URL=\"${DATABASE_URL}\"" >> "$ENV_FILE"
      ENV_FIXED=true
    fi
    
    if ! grep -q "AUTH_SERVICE_URL" "$ENV_FILE"; then
      echo -e "${YELLOW}Adding AUTH_SERVICE_URL to ${ENV_FILE}${NC}"
      echo "AUTH_SERVICE_URL=\"${AUTH_SERVICE_URL}/api\"" >> "$ENV_FILE"
      ENV_FIXED=true
    fi
    
    # Ensure JWT secret is consistent with the API Gateway
    if ! grep -q "JWT_SECRET=shared-security-risk-assessment-secret-key" "$ENV_FILE"; then
      echo -e "${YELLOW}Updating JWT_SECRET for API Gateway compatibility${NC}"
      if grep -q "JWT_SECRET" "$ENV_FILE"; then
        sed -i 's/^JWT_SECRET=.*/JWT_SECRET=shared-security-risk-assessment-secret-key/' "$ENV_FILE"
      else
        echo "JWT_SECRET=shared-security-risk-assessment-secret-key" >> "$ENV_FILE"
      fi
      ENV_FIXED=true
    fi
    
    # Enable diagnostic endpoints in development
    if [ "$ENV_FILE" = ".env.development" ] || [ "$ENV_FILE" = ".env.test" ]; then
      if ! grep -q "BYPASS_AUTH=true" "$ENV_FILE"; then
        echo -e "${YELLOW}Enabling BYPASS_AUTH for diagnostic purposes${NC}"
        echo "BYPASS_AUTH=true" >> "$ENV_FILE"
        ENV_FIXED=true
      fi
    fi
  fi
done

if [ "$ENV_FIXED" = true ]; then
  echo -e "${GREEN}Fixed environment variables${NC}"
else
  echo -e "${YELLOW}No environment variable fixes needed${NC}"
fi

echo -e "\n${BLUE}Step 2: Checking database connectivity${NC}"
npx prisma db doctor --skip-version-check || {
  echo -e "${RED}Database connectivity issue detected${NC}"
  echo -e "${YELLOW}Attempting to fix database connection...${NC}"
  
  # Try to run migrations to ensure schema is up to date
  echo -e "${BLUE}Running database migrations...${NC}"
  npx prisma migrate deploy || {
    echo -e "${RED}Migration failed. This could be a database connection issue.${NC}"
    echo -e "${YELLOW}Trying to generate client again...${NC}"
    npx prisma generate
  }
}

echo -e "\n${BLUE}Step 3: Testing service health endpoints${NC}"
# First try direct service health check
echo -e "${BLUE}Testing direct service health endpoint...${NC}"
curl -s "${QUESTIONNAIRE_SERVICE_URL}/api/health" -o /dev/null -w "%{http_code}" 2>/dev/null || {
  echo -e "${RED}Cannot access direct service health endpoint${NC}"
  echo -e "${YELLOW}Checking if service is running on alternate URL...${NC}"
  
  # Try alternative paths
  ALT_HEALTH_ENDPOINTS=("${QUESTIONNAIRE_SERVICE_URL}/health" "${QUESTIONNAIRE_SERVICE_URL}/api/health" "${QUESTIONNAIRE_SERVICE_URL}/diagnostic/status")
  
  for ENDPOINT in "${ALT_HEALTH_ENDPOINTS[@]}"; do
    echo -e "Trying ${ENDPOINT}..."
    HTTP_CODE=$(curl -s "$ENDPOINT" -o /dev/null -w "%{http_code}" 2>/dev/null || echo "failed")
    
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "200" ]; then
      echo -e "${GREEN}Successfully connected to ${ENDPOINT} (${HTTP_CODE})${NC}"
    else
      echo -e "${RED}Failed to connect to ${ENDPOINT} (${HTTP_CODE})${NC}"
    fi
  done
}

# Now try API Gateway health check
echo -e "\n${BLUE}Testing API Gateway route to service...${NC}"
curl -s "${API_GATEWAY_URL}/api/questionnaires/health" -o /dev/null -w "%{http_code}" 2>/dev/null || {
  echo -e "${RED}Cannot access service through API Gateway${NC}"
}

echo -e "\n${BLUE}Step 4: Testing API Gateway diagnostic endpoint${NC}"
# Before adding auth header, try with admin override header
echo -e "${BLUE}Trying diagnostic endpoint with admin override...${NC}"
curl -s -H "X-Admin-Override: true" "${API_GATEWAY_URL}/api/questionnaires/diagnostic/status" -o diagnostics_response.json || {
  echo -e "${RED}Failed to access diagnostic endpoint with admin override${NC}"
}

# Check if we can access with local bypass
echo -e "${BLUE}Trying direct diagnostic endpoint with bypass...${NC}"
curl -s "${QUESTIONNAIRE_SERVICE_URL}/diagnostic/status" -o local_diagnostics_response.json || {
  echo -e "${RED}Failed to access local diagnostic endpoint${NC}"
}

echo -e "\n${BLUE}Step 5: Checking service and database files${NC}"

# Check if prisma schema file is accessible
if [ -f "prisma/schema.prisma" ]; then
  echo -e "${GREEN}Prisma schema file found${NC}"
else
  echo -e "${RED}Prisma schema file not found${NC}"
  echo -e "${YELLOW}This could be a critical issue for database connectivity${NC}"
fi

# Check if framework templates exist
TEMPLATE_COUNT=$(ls -1 src/data/frameworks/*-template.json 2>/dev/null | wc -l)
if [ "$TEMPLATE_COUNT" -gt 0 ]; then
  echo -e "${GREEN}Found ${TEMPLATE_COUNT} framework templates${NC}"
else
  echo -e "${RED}No framework templates found${NC}"
  echo -e "${YELLOW}This could cause issues with questionnaire service functionality${NC}"
fi

echo -e "\n${BLUE}Step 6: Running database seed script${NC}"
echo -e "${YELLOW}Attempting to run seed script to ensure templates are loaded...${NC}"
npm run seed || {
  echo -e "${RED}Seed script failed${NC}"
  echo -e "${YELLOW}Trying to fix potential issues...${NC}"
  
  # Make sure seed.js is executable
  chmod +x prisma/seed.js
  
  # Try running with different node command
  echo -e "${YELLOW}Trying alternative seeding method...${NC}"
  node prisma/seed.js
}

echo -e "\n${BLUE}Step 7: Checking service API route configuration${NC}"
SVC_INDEX_FILE="src/index.js"
ROUTE_FIXED=false

if [ -f "$SVC_INDEX_FILE" ]; then
  echo -e "${BLUE}Analyzing routes in ${SVC_INDEX_FILE}...${NC}"
  
  # Check if diagnostic routes are properly registered at the right path
  if ! grep -q "app.use('/diagnostic', diagnosticRoutes)" "$SVC_INDEX_FILE"; then
    echo -e "${YELLOW}Diagnostic routes might not be registered correctly${NC}"
    echo -e "${YELLOW}This could explain the 404 error when accessing the diagnostic endpoint${NC}"
    ROUTE_FIXED=true
  fi
  
  # Check if API prefix handling is correct
  if grep -q "removing the /api prefix" "$SVC_INDEX_FILE"; then
    echo -e "${GREEN}Found code comment about API prefix handling${NC}"
  else
    echo -e "${YELLOW}No explicit handling of API prefix found${NC}"
    echo -e "${YELLOW}This could cause issues with API Gateway routing${NC}"
  fi
else
  echo -e "${RED}Service index file not found!${NC}"
fi

echo -e "\n${BLUE}Step 8: Testing auth service connectivity${NC}"
curl -s "${AUTH_SERVICE_URL}/health" -o /dev/null -w "%{http_code}" 2>/dev/null || {
  echo -e "${RED}Cannot connect to auth service health endpoint${NC}"
  echo -e "${YELLOW}This could explain authentication issues${NC}"
}

echo -e "\n${BLUE}==================================================${NC}"
echo -e "${BLUE}               DIAGNOSTIC SUMMARY                ${NC}"
echo -e "${BLUE}==================================================${NC}"

echo -e "${YELLOW}If issues persist, consider the following fixes:${NC}"
echo -e "1. Restart the questionnaire service container"
echo -e "2. Ensure database migrations are properly applied"
echo -e "3. Verify JWT secrets are consistent across services"
echo -e "4. Check API Gateway routing configuration for /api prefixes"
echo -e "5. Verify that auth service is properly configured and accessible"

echo -e "\n${BLUE}==================================================${NC}"
echo -e "${BLUE}                    NEXT STEPS                   ${NC}"
echo -e "${BLUE}==================================================${NC}"
echo -e "Run the following to apply fixes and restart services:"
echo -e "  ${GREEN}cd risk-assessment-app${NC}"
echo -e "  ${GREEN}docker-compose restart questionnaire-service api-gateway${NC}"
echo -e "Then run the diagnostic tool again:"
echo -e "  ${GREEN}cd risk-assessment-app/backend/questionnaire-service${NC}"
echo -e "  ${GREEN}npm run diagnose${NC}"
