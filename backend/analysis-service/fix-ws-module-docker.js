#!/usr/bin/env node

/**
 * Analysis Service WS Module Docker Fix
 * 
 * This script fixes the WS module installation issue in the Docker container
 * by ensuring proper npm installation and resolving common Docker build issues.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Analysis Service WS Module Docker Fix');
console.log('=========================================');

const serviceDir = __dirname;
const packageJsonPath = path.join(serviceDir, 'package.json');
const dockerfilePath = path.join(serviceDir, 'Dockerfile');

// Step 1: Verify package.json has ws dependency
console.log('\n📦 Checking package.json for ws dependency...');
try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    if (packageJson.dependencies && packageJson.dependencies.ws) {
        console.log('✅ ws dependency found in package.json:', packageJson.dependencies.ws);
    } else {
        console.log('❌ ws dependency missing from package.json');
        console.log('Adding ws dependency...');
        
        if (!packageJson.dependencies) {
            packageJson.dependencies = {};
        }
        packageJson.dependencies.ws = '^8.13.0';
        
        fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
        console.log('✅ Added ws dependency to package.json');
    }
} catch (error) {
    console.error('❌ Error reading package.json:', error.message);
    process.exit(1);
}

// Step 2: Create an improved Dockerfile
console.log('\n🐳 Creating improved Dockerfile...');
const improvedDockerfile = `FROM node:16-alpine

# Install system dependencies for native modules
RUN apk add --no-cache \\
    python3 \\
    make \\
    g++ \\
    libc6-compat

WORKDIR /app

# Copy package files
COPY package*.json ./

# Clear npm cache and install dependencies with verbose logging
RUN npm cache clean --force && \\
    npm ci --only=production --verbose

# Verify ws module installation
RUN npm list ws || (echo "WS module not found, installing directly..." && npm install ws@^8.13.0)

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Verify the installation
RUN node -e "console.log('Testing WS module...'); const WebSocket = require('ws'); console.log('✅ WS module loaded successfully');"

EXPOSE 5004

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
    CMD node -e "require('ws')" || exit 1

CMD ["npm", "start"]`;

// Backup existing Dockerfile
const backupPath = `${dockerfilePath}.backup.${Date.now()}`;
if (fs.existsSync(dockerfilePath)) {
    fs.copyFileSync(dockerfilePath, backupPath);
    console.log(`📋 Backed up existing Dockerfile to ${path.basename(backupPath)}`);
}

fs.writeFileSync(dockerfilePath, improvedDockerfile);
console.log('✅ Created improved Dockerfile with WS module fix');

// Step 3: Create a Docker build script
console.log('\n🔨 Creating Docker build script...');
const buildScript = `#!/bin/bash

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
fi`;

const buildScriptPath = path.join(serviceDir, 'build-with-ws-fix.sh');
fs.writeFileSync(buildScriptPath, buildScript);
fs.chmodSync(buildScriptPath, '755');
console.log('✅ Created Docker build script: build-with-ws-fix.sh');

// Step 4: Create a docker-compose override for analysis service
console.log('\n🐙 Creating docker-compose override...');
const dockerComposeOverride = `version: '3.8'

services:
  analysis-service:
    build:
      context: ./backend/analysis-service
      dockerfile: Dockerfile
      args:
        - BUILDKIT_INLINE_CACHE=1
    environment:
      - NODE_ENV=development
    volumes:
      - ./backend/analysis-service:/app
      - /app/node_modules  # Prevent local node_modules from overriding container ones
    depends_on:
      - postgres
      - redis
    networks:
      - app-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "-e", "require('ws')"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s`;

const overridePath = path.join(serviceDir, 'docker-compose.analysis.yml');
fs.writeFileSync(overridePath, dockerComposeOverride);
console.log('✅ Created docker-compose override file');

// Step 5: Create a verification script
console.log('\n🔍 Creating verification script...');
const verificationScript = `#!/usr/bin/env node

/**
 * Verify WS Module Installation
 */

console.log('🔍 Verifying WS Module Installation');
console.log('===================================');

try {
    // Test basic require
    console.log('Testing basic require...');
    const WebSocket = require('ws');
    console.log('✅ Basic require successful');
    
    // Test WebSocket creation
    console.log('Testing WebSocket creation...');
    const ws = new WebSocket.Server({ port: 0 });
    console.log('✅ WebSocket server creation successful');
    
    // Get version info
    const packagePath = require.resolve('ws/package.json');
    const wsPackage = require(packagePath);
    console.log('✅ WS Version:', wsPackage.version);
    
    ws.close();
    console.log('🎉 All WS module tests passed!');
    
} catch (error) {
    console.error('❌ WS Module verification failed:');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    
    console.log('\\n🔧 Troubleshooting suggestions:');
    console.log('1. Run: npm install ws@^8.13.0');
    console.log('2. Clear npm cache: npm cache clean --force');
    console.log('3. Delete node_modules and package-lock.json, then npm install');
    console.log('4. Check for native compilation issues');
    
    process.exit(1);
}`;

const verifyScriptPath = path.join(serviceDir, 'verify-ws-module.js');
fs.writeFileSync(verifyScriptPath, verificationScript);
fs.chmodSync(verifyScriptPath, '755');
console.log('✅ Created verification script: verify-ws-module.js');

// Step 6: Create a comprehensive fix script
console.log('\n🛠️  Creating comprehensive fix script...');
const comprehensiveFixScript = `#!/bin/bash

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
echo "docker-compose -f docker-compose.yml -f backend/analysis-service/docker-compose.analysis.yml up analysis-service"`;

const comprehensiveFixPath = path.join(serviceDir, 'fix-ws-complete.sh');
fs.writeFileSync(comprehensiveFixPath, comprehensiveFixScript);
fs.chmodSync(comprehensiveFixPath, '755');
console.log('✅ Created comprehensive fix script: fix-ws-complete.sh');

console.log('\n🎉 WS Module Docker Fix Setup Complete!');
console.log('=====================================');
console.log('\nNext steps:');
console.log('1. Run the comprehensive fix:');
console.log('   cd backend/analysis-service && ./fix-ws-complete.sh');
console.log('');
console.log('2. Or run individual steps:');
console.log('   - Verify local: node verify-ws-module.js');
console.log('   - Build container: ./build-with-ws-fix.sh');
console.log('');
console.log('3. Use with docker-compose:');
console.log('   docker-compose -f docker-compose.yml -f backend/analysis-service/docker-compose.analysis.yml up analysis-service');
console.log('');
console.log('The fix addresses:');
console.log('- ✅ Native module compilation in Alpine Linux');
console.log('- ✅ npm cache and installation issues');
console.log('- ✅ Docker build cache problems');
console.log('- ✅ Proper verification and health checks');
