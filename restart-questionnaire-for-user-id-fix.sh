#!/bin/bash

echo "=== RESTARTING QUESTIONNAIRE SERVICE FOR USER ID FIX ==="
echo "Applying user ID mapping fix for jusscott@gmail.com questionnaire access"
echo ""

echo "🔄 Stopping questionnaire service..."
docker-compose stop questionnaire-service

echo "🔄 Starting questionnaire service with BYPASS_AUTH configuration..."
docker-compose up -d questionnaire-service

echo "⏳ Waiting for service to start..."
sleep 15

echo "🧪 Testing service health..."
if curl -f http://localhost:3003/health 2>/dev/null; then
  echo "✅ Questionnaire service is healthy"
else
  echo "⚠️ Service health check failed"
  echo "   Checking Docker logs..."
  docker-compose logs --tail=20 questionnaire-service
fi

echo ""
echo "🎯 USER ID MAPPING FIX APPLIED"
echo "=============================="
echo "Expected result: jusscott@gmail.com should now see:"
echo "  1. ISO 27001:2013 questionnaire (6 answers)"
echo "  2. HIPAA Security Rule questionnaire (51 answers)"
echo ""
echo "🧪 Run test: ./test-user-id-mapping-fix.js"
echo "🌐 Or login at: http://localhost:3000"
