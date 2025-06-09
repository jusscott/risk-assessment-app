#!/bin/bash

echo "Stopping questionnaire-service..."
docker-compose stop questionnaire-service

echo "Fixing environment variables..."
cd backend/questionnaire-service
node scripts/docker-env-fix.js

echo "Restarting questionnaire-service..."
cd ../..
docker-compose up -d questionnaire-service

echo "Waiting for service to stabilize..."
sleep 5

echo "Checking service status..."
docker-compose ps questionnaire-service
