#!/bin/bash

# Restart script for the questionnaire service with special handling
# for issues that may cause restart loops

# Set error handling
set -e

echo "🔄 Restarting questionnaire service with enhanced error detection..."

# Check if service container exists
if docker ps -a | grep -q "questionnaire-service"; then
    echo "🛑 Stopping questionnaire service container..."
    docker stop questionnaire-service || true
    
    echo "🗑️ Removing questionnaire service container..."
    docker rm -f questionnaire-service || true
fi

# Create a backup of key files in case we need to roll back
echo "📦 Creating backups of key files..."
mkdir -p ./backup-$(date +%s)
cp -f ./backend/questionnaire-service/src/utils/enhanced-client.js ./backup-$(date +%s)/ 2>/dev/null || true
cp -f ./backend/questionnaire-service/src/utils/enhanced-client-wrapper.js ./backup-$(date +%s)/ 2>/dev/null || true
cp -f ./backend/questionnaire-service/src/controllers/submission.controller.js ./backup-$(date +%s)/ 2>/dev/null || true
cp -f ./backend/questionnaire-service/src/index.js ./backup-$(date +%s)/ 2>/dev/null || true
cp -f ./backend/questionnaire-service/src/middlewares/auth.middleware.js ./backup-$(date +%s)/ 2>/dev/null || true

# Apply the fixes
echo "🔧 Applying fixes to resolve restart issues..."
node fix-questionnaire-restart-issue.js

# Rebuild the container with fresh dependencies
echo "🏗️ Rebuilding questionnaire service container..."
docker-compose build questionnaire-service

# Start the service with enhanced logging
echo "🚀 Starting questionnaire service with enhanced monitoring..."
docker-compose up -d questionnaire-service

# Follow logs to monitor startup progress
echo "📋 Following logs to monitor startup (press Ctrl+C to stop watching logs)..."
echo "⚠️ Note: Even if you stop watching logs, the service will continue running"

# Wait a moment for container to initialize
sleep 2

# Enhanced logging with timestamps for debugging
docker-compose logs -f --tail=100 questionnaire-service

# Check service status if logs are interrupted
echo "ℹ️ Checking questionnaire service status..."
if docker ps | grep -q "questionnaire-service"; then
    echo "✅ Questionnaire service is running"
    
    # Check if service is responding to health checks
    echo "🔍 Waiting for service to become available..."
    attempts=0
    max_attempts=10
    
    while [ $attempts -lt $max_attempts ]; do
        if curl -s http://localhost:5002/health >/dev/null 2>&1; then
            echo "✅ Service is responding to health checks!"
            exit 0
        fi
        
        attempts=$((attempts+1))
        echo "⏳ Waiting for service to respond... (attempt $attempts/$max_attempts)"
        sleep 3
    done
    
    echo "⚠️ Service is running but not responding to health checks yet."
    echo "ℹ️ You can check the status manually with: docker-compose ps"
    echo "📋 Or view logs with: docker-compose logs -f questionnaire-service"
else
    echo "❌ Service failed to start. Check logs for details:"
    docker-compose logs --tail=50 questionnaire-service
    exit 1
fi
