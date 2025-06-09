#!/bin/bash

echo "🛠️  Analysis Service WS Module Comprehensive Fix"
echo "==============================================="

# Step 1: Clean npm cache and reinstall
echo "🧹 Cleaning npm cache and reinstalling dependencies..."
rm -rf node_modules package-lock.json
npm cache clean --force
npm install

# Step 2: Verify local installation
echo "🔍 Verifying local WS module installation..."
node verify-ws-module.js

if [ $? -ne 0 ]; then
    echo "❌ Local verification failed, attempting direct install..."
    npm install ws@^8.13.0 --save
    node verify-ws-module.js
fi

# Step 3: Build Docker container
echo "🐳 Building Docker container with WS fix..."
./build-with-ws-fix.sh

echo "🎉 Comprehensive fix completed!"
echo ""
echo "To use the fixed container in docker-compose:"
echo "docker-compose -f docker-compose.yml -f backend/analysis-service/docker-compose.analysis.yml up analysis-service"