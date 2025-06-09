#!/bin/bash

echo "🚀 Restarting services with fixes applied..."

# Navigate to project directory
cd risk-assessment-app

# Apply Report Service migration
echo "📊 Applying Report Service migration..."
docker exec risk-assessment-app-report-service-1 npx prisma migrate deploy || echo "⚠️  Migration may have already been applied"

# Restart services in dependency order
echo "🔄 Restarting services..."

# Restart Report Service first (others depend on it)
docker restart risk-assessment-app-report-service-1
sleep 5

# Restart Analysis Service (needs Report Service healthy for WebSocket recovery)
docker restart risk-assessment-app-analysis-service-1
sleep 5

# Restart Questionnaire Service 
docker restart risk-assessment-app-questionnaire-service-1
sleep 3

# Restart API Gateway last
docker restart risk-assessment-app-api-gateway-1
sleep 3

echo "✅ All services restarted!"

# Reset circuit breakers after services are up
echo "🔄 Resetting circuit breakers..."
sleep 10
node backend/scripts/circuit-breaker/reset-circuit-breakers.js

echo "🎉 Service fixes applied and systems recovered!"
