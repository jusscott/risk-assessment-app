#!/bin/bash

echo "Restarting frontend service to apply logout navigation fixes..."

# Enter the risk-assessment-app directory
cd risk-assessment-app

# Assuming standard docker-compose setup
docker-compose restart frontend

echo "Frontend service restarted. Logout functionality should now work correctly."
