#!/bin/bash

# Stop and restart the questionnaire service
echo "Stopping questionnaire service..."
docker-compose stop questionnaire-service

echo "Starting questionnaire service..."
docker-compose start questionnaire-service

echo "Questionnaire service restarted with case sensitivity fixes applied."
