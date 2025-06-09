#!/usr/bin/env node

const axios = require('axios');
const { spawn } = require('child_process');

/**
 * Verification script for auth service health endpoint fix
 * Tests both internal health endpoints and Docker health check compatibility
 */

const AUTH_SERVICE_URL = 'http://localhost:5001';
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testHealthEndpoint(endpoint, description) {
  try {
    log(`\n🔍 Testing ${description}...`, 'blue');
    
    const response = await axios.get(`${AUTH_SERVICE_URL}${endpoint}`, {
      timeout: 5000,
      validateStatus: (status) => status < 500 // Accept 2xx, 3xx, 4xx but not 5xx
    });
    
    if (response.status === 200) {
      log(`✅ ${description} - Status: ${response.status}`, 'green');
      log(`   Response: ${JSON.stringify(response.data, null, 2)}`, 'reset');
      return true;
    } else {
      log(`⚠️  ${description} - Status: ${response.status}`, 'yellow');
      log(`   Response: ${JSON.stringify(response.data, null, 2)}`, 'reset');
      return false;
    }
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      log(`❌ ${description} - Connection refused (service not running)`, 'red');
    } else if (error.response) {
      log(`❌ ${description} - Status: ${error.response.status}`, 'red');
      log(`   Error: ${JSON.stringify(error.response.data, null, 2)}`, 'reset');
    } else {
      log(`❌ ${description} - Error: ${error.message}`, 'red');
    }
    return false;
  }
}

async function testDockerHealthCheck() {
  return new Promise((resolve) => {
    log(`\n🐳 Testing Docker health check command...`, 'blue');
    
    const healthCheck = spawn('docker', [
      'exec', 
      'auth-service', 
      'wget', 
      '--spider', 
      '-q', 
      'http://localhost:5001/health'
    ]);
    
    let stdout = '';
    let stderr = '';
    
    healthCheck.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    healthCheck.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    healthCheck.on('close', (code) => {
      if (code === 0) {
        log(`✅ Docker health check - Exit code: ${code}`, 'green');
        log(`   wget command executed successfully`, 'reset');
        resolve(true);
      } else {
        log(`❌ Docker health check - Exit code: ${code}`, 'red');
        if (stderr) log(`   Error: ${stderr.trim()}`, 'reset');
        resolve(false);
      }
    });
    
    healthCheck.on('error', (error) => {
      log(`❌ Docker health check - Error: ${error.message}`, 'red');
      resolve(false);
    });
  });
}

async function checkContainerStatus() {
  return new Promise((resolve) => {
    log(`\n📊 Checking auth-service container status...`, 'blue');
    
    const dockerPs = spawn('docker', ['ps', '--filter', 'name=auth-service', '--format', 'table {{.Names}}\\t{{.Status}}\\t{{.Ports}}']);
    
    let stdout = '';
    let stderr = '';
    
    dockerPs.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    dockerPs.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    dockerPs.on('close', (code) => {
      if (code === 0 && stdout.includes('auth-service')) {
        log(`✅ Auth service container is running`, 'green');
        log(`   ${stdout.trim()}`, 'reset');
        resolve(true);
      } else {
        log(`❌ Auth service container not found or not running`, 'red');
        if (stderr) log(`   Error: ${stderr.trim()}`, 'reset');
        resolve(false);
      }
    });
    
    dockerPs.on('error', (error) => {
      log(`❌ Docker ps command failed - Error: ${error.message}`, 'red');
      resolve(false);
    });
  });
}

async function main() {
  log('🚀 Auth Service Health Endpoint Verification', 'blue');
  log('=' .repeat(50), 'blue');
  
  // Check container status first
  const containerRunning = await checkContainerStatus();
  
  if (!containerRunning) {
    log('\n❌ Auth service container is not running. Please start it first:', 'red');
    log('   cd risk-assessment-app && docker-compose up auth-service', 'reset');
    process.exit(1);
  }
  
  // Wait a moment for service to be ready
  log('\n⏳ Waiting 2 seconds for service to be ready...', 'yellow');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test health endpoints
  const results = [];
  results.push(await testHealthEndpoint('/health', 'Basic health endpoint (/health)'));
  results.push(await testHealthEndpoint('/', 'Root health endpoint (/)'));
  results.push(await testHealthEndpoint('/deep', 'Deep health endpoint (/deep)'));
  
  // Test Docker health check
  const dockerHealthResult = await testDockerHealthCheck();
  results.push(dockerHealthResult);
  
  // Summary
  log('\n📋 Test Summary', 'blue');
  log('=' .repeat(30), 'blue');
  
  const passed = results.filter(Boolean).length;
  const total = results.length;
  
  if (passed === total) {
    log(`✅ All tests passed (${passed}/${total})`, 'green');
    log('\n🎉 Auth service health endpoint fix is working correctly!', 'green');
    log('   - Basic health endpoint accessible at /health', 'reset');
    log('   - Docker health checks will pass', 'reset');
    log('   - Both shallow and deep health checks available', 'reset');
  } else {
    log(`⚠️  Some tests failed (${passed}/${total})`, 'yellow');
    log('\n🔧 The health endpoint may need additional fixes.', 'yellow');
  }
  
  process.exit(passed === total ? 0 : 1);
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  log(`\n💥 Uncaught error: ${error.message}`, 'red');
  process.exit(1);
});

main().catch((error) => {
  log(`\n💥 Script error: ${error.message}`, 'red');
  process.exit(1);
});
