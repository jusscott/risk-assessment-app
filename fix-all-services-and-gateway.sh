#!/bin/bash

echo "=== Starting comprehensive service fix and restart ==="

# Navigate to project directory
cd "$(dirname "$0")"

echo "=== Fixing Redis compatibility in API Gateway ==="
node fix-api-gateway-redis.js

echo "=== Restarting failing services ==="
docker restart analysis-service
docker restart report-service
docker restart questionnaire-service
docker restart circuit-breaker-monitor

echo "=== Waiting for services to initialize (30s) ==="
sleep 30

echo "=== Restarting API Gateway ==="
docker restart api-gateway

echo "=== Waiting for API Gateway to start (10s) ==="
sleep 10

echo "=== Checking service status ==="
docker ps | grep -E 'api-gateway|analysis-service|report-service|questionnaire-service|circuit-breaker-monitor'

echo "=== Checking API Gateway logs ==="
docker logs api-gateway --tail 20

echo "=== Fix and restart completed ==="
echo "If services are still unhealthy, check individual service logs with:"
echo "docker logs [service-name] --tail 50"
