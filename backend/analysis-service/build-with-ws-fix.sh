#!/bin/bash

echo "🐳 Building Analysis Service with WS Module Fix"
echo "=============================================="

# Clean up any existing containers/images
echo "🧹 Cleaning up existing containers and images..."
docker stop analysis-service 2>/dev/null || true
docker rm analysis-service 2>/dev/null || true
docker rmi risk-assessment-app_analysis-service 2>/dev/null || true

# Build with no cache to ensure fresh installation
echo "🔨 Building Docker image with no cache..."
docker build --no-cache -t risk-assessment-app_analysis-service .

if [ $? -eq 0 ]; then
    echo "✅ Docker build completed successfully"
    
    # Test the container
    echo "🧪 Testing WS module in container..."
    docker run --rm risk-assessment-app_analysis-service node -e "
        console.log('Testing WS module in container...');
        try {
            const WebSocket = require('ws');
            console.log('✅ WS module works correctly in container');
            console.log('WS version:', require('ws/package.json').version);
            process.exit(0);
        } catch (error) {
            console.error('❌ WS module test failed:', error.message);
            process.exit(1);
        }
    "
    
    if [ $? -eq 0 ]; then
        echo "🎉 Analysis service container is ready with working WS module!"
    else
        echo "❌ WS module test failed in container"
        exit 1
    fi
else
    echo "❌ Docker build failed"
    exit 1
fi