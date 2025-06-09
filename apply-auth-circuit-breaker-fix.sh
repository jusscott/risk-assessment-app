#!/bin/bash
# Comprehensive fix for the auth circuit breaker issue

echo "Applying auth circuit breaker fix to questionnaire service..."

# Step 1: Run the token util and auth middleware fixes
echo "Step 1: Applying token utility and auth middleware fixes..."
node fix-questionnaire-auth-circuit-breaker.js
if [ $? -ne 0 ]; then
  echo "Error: Failed to apply token utility and auth middleware fixes"
  exit 1
fi

# Step 2: Update questionnaire service index.js
echo "Step 2: Updating questionnaire service index.js with event handling..."
node update-questionnaire-index-fixed.js
if [ $? -ne 0 ]; then
  echo "Error: Failed to update questionnaire service index.js"
  exit 1
fi

# Step 3: Apply new JWT configuration
echo "Step 3: Ensuring consistent JWT secrets across services..."
cat << EOF > backend/questionnaire-service/.env.update
# Circuit breaker configuration
AUTH_JWT_SECRET=shared-security-risk-assessment-secret-key
CIRCUIT_BREAKER_FALLBACK_ENABLED=false
EOF

# Merge the new env settings with existing env file
cat backend/questionnaire-service/.env.update >> backend/questionnaire-service/.env
rm backend/questionnaire-service/.env.update

echo "All fixes applied successfully!"
echo "To restart the services and apply the changes, run:"
echo "./restart-for-circuit-breaker-fix.sh"
