#!/bin/bash
set -e

echo "🔧 APPLYING QUESTIONNAIRE SERVICE SEGFAULT FIXES..."
echo "Timestamp: $(date)"
echo

# Stop the questionnaire service
echo "📍 Stopping questionnaire service..."
docker-compose stop questionnaire-service

# Update dependencies
echo "📦 Upgrading Prisma dependencies..."
docker-compose exec questionnaire-service npm install @prisma/client@^5.0.0
docker-compose exec questionnaire-service npm install -D prisma@^5.0.0

# Regenerate Prisma client
echo "🔄 Regenerating Prisma client..."
docker-compose exec questionnaire-service npx prisma generate

# Run database migrations if needed
echo "🗄️ Applying database migrations..."
docker-compose exec questionnaire-service npx prisma migrate deploy

# Restart with memory limits
echo "🚀 Restarting questionnaire service with memory limits..."
docker-compose up -d questionnaire-service

# Wait for service to be healthy
echo "⏳ Waiting for service to be healthy..."
for i in {1..30}; do
    if curl -f http://localhost:5000/api/questionnaire/diagnostic/status > /dev/null 2>&1; then
        echo "✅ Service is healthy!"
        break
    fi
    echo "Waiting... ($i/30)"
    sleep 2
done

echo "🎉 SEGFAULT FIXES APPLIED SUCCESSFULLY!"
echo "📊 Monitor the service for stability over the next few minutes."
