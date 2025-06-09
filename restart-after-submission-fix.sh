#!/bin/bash

echo "Applying fix to submission controller..."
node risk-assessment-app/fix-submission-prisma-error.js

echo "Restarting questionnaire service..."
docker-compose restart questionnaire-service

echo "Waiting for service to initialize..."
sleep 5

echo "Fix applied and service restarted. Please try accessing questionnaires again."
