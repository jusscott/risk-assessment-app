/**
 * Connectivity Fix Diagnostics Tool
 * 
 * This script tests the enhanced connectivity fixes to verify they're working correctly.
 * It checks:
 * 1. Health endpoints are accessible
 * 2. Enhanced client is properly configured
 * 3. Circuit breaker functionality
 * 4. Retry mechanisms
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
  services: [
    { name: 'auth-service', url: process.env.AUTH_SERVICE_URL || 'http://localhost:3001' },
    { name: 'questionnaire-service', url: process.env.QUESTIONNAIRE_SERVICE_URL || 'http://localhost:3002' },
    { name: 'analysis-service', url: process.env.ANALYSIS_SERVICE_URL || 'http://localhost:3003' },
    { name: 'report-service', url: process.env.REPORT_SERVICE_URL || 'http://localhost:3004' }
  ]
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

// Print header
function printHeader(text) {
  console.log('\n' + colors.cyan + '='.repeat(80) + colors.reset);
  console.log(colors.cyan + '  ' + text + colors.reset);
  console.log(colors.cyan + '='.repeat(80) + colors.reset);
}

// Print result
function printResult(text, success) {
  const icon = success ? '✅' : '❌';
  const color = success ? colors.green : colors.red;
  console.log(color + icon + ' ' + text + colors.reset);
}

// Check if a file exists and contains a specific pattern
async function checkFileContains(filePath, pattern) {
  try {
    if (!fs.existsSync(filePath)) {
      return false;
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    return content.includes(pattern);
  } catch (error) {
    return false;
  }
}

// Check health endpoints for each service
async function checkHealthEndpoints() {
  printHeader('Checking Health Endpoints');
  
  for (const service of CONFIG.services) {
    try {
      const response = await axios.get(`${service.url}/health`, { timeout: 2000 });
      const isHealthy = response.status === 200 && response.data.status === 'ok';
      
      printResult(
        `${service.name} health endpoint: ${isHealthy ? 'Responding correctly' : 'Invalid response'}`,
        isHealthy
      );
    } catch (error) {
      printResult(
        `${service.name} health endpoint: Not accessible (${error.message})`,
        false
      );
    }
  }
}

// Check configuration files
async function checkConfiguration() {
  printHeader('Checking Configuration');
  
  // Check config.js
  const configPath = path.join(__dirname, '../src/config/config.js');
  const hasEnhancedConfig = await checkFileContains(configPath, 'enhancedConnectivity');
  printResult(
    'Enhanced connectivity configuration in config.js',
    hasEnhancedConfig
  );
  
  // Check package.json for required dependencies
  const packagePath = path.join(__dirname, '../package.json');
  let packageJson;
  
  try {
    packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    
    const hasAxiosRetry = packageJson.dependencies && packageJson.dependencies['axios-retry'];
    printResult(
      'axios-retry dependency in package.json',
      !!hasAxiosRetry
    );
    
    const hasCircuitBreaker = packageJson.dependencies && packageJson.dependencies['opossum'];
    printResult(
      'Circuit breaker (opossum) dependency in package.json',
      !!hasCircuitBreaker
    );
  } catch (error) {
    printResult(
      'Error reading package.json',
      false
    );
  }
  
  // Check enhanced client utility
  const clientPath = path.join(__dirname, '../src/utils/enhanced-client.js');
  const hasEnhancedClient = fs.existsSync(clientPath);
  printResult(
    'Enhanced client utility file exists',
    hasEnhancedClient
  );
  
  if (hasEnhancedClient) {
    const hasRetry = await checkFileContains(clientPath, 'axiosRetry');
    printResult(
      'Enhanced client has retry functionality',
      hasRetry
    );
    
    const hasCircuitBreaker = await checkFileContains(clientPath, 'CircuitBreaker');
    printResult(
      'Enhanced client has circuit breaker functionality',
      hasCircuitBreaker
    );
  }
}

// Check middleware updates
async function checkMiddlewareUpdates() {
  printHeader('Checking Middleware Updates');
  
  // Check auth middleware
  const authMiddlewarePath = path.join(__dirname, '../src/middlewares/auth.middleware.js');
  if (fs.existsSync(authMiddlewarePath)) {
    const usesEnhancedClient = await checkFileContains(authMiddlewarePath, 'enhanced-client');
    printResult(
      'Auth middleware uses enhanced client',
      usesEnhancedClient
    );
  } else {
    printResult(
      'Auth middleware file not found',
      false
    );
  }
  
  // Check optimized auth middleware
  const optimizedAuthPath = path.join(__dirname, '../src/middlewares/optimized-auth.middleware.js');
  if (fs.existsSync(optimizedAuthPath)) {
    const usesEnhancedClient = await checkFileContains(optimizedAuthPath, 'enhanced-client');
    printResult(
      'Optimized auth middleware uses enhanced client',
      usesEnhancedClient
    );
  } else {
    printResult(
      'Optimized auth middleware file not found (optional)',
      true
    );
  }
}

// Basic connectivity test
async function testConnectivity() {
  printHeader('Testing Basic Connectivity');
  
  for (const service of CONFIG.services) {
    if (service.name === 'questionnaire-service') continue; // Skip self
    
    try {
      const start = Date.now();
      const response = await axios.get(`${service.url}/health`, { timeout: 2000 });
      const duration = Date.now() - start;
      
      printResult(
        `Connection to ${service.name}: Success (${duration}ms)`,
        true
      );
    } catch (error) {
      printResult(
        `Connection to ${service.name}: Failed (${error.message})`,
        false
      );
    }
  }
}

// Check Docker logs for circuit breaker events
async function checkLogs() {
  printHeader('Checking Recent Logs');
  
  try {
    // Get last 20 lines of logs
    const logs = execSync('docker-compose logs --tail=20 questionnaire-service', { 
      cwd: path.join(__dirname, '../../../'),
      encoding: 'utf8' 
    });
    
    // Look for key log messages
    const hasHealthLog = logs.includes('health');
    const hasCircuitLog = logs.includes('Circuit breaker');
    const hasErrorLog = logs.includes('Error');
    
    console.log(colors.yellow + 'Recent Log Analysis:' + colors.reset);
    
    if (hasHealthLog) {
      console.log(colors.green + '- Health endpoint activity detected' + colors.reset);
    }
    
    if (hasCircuitLog) {
      console.log(colors.yellow + '- Circuit breaker activity detected' + colors.reset);
    }
    
    if (hasErrorLog) {
      console.log(colors.red + '- Error messages detected' + colors.reset);
    }
    
    if (!hasHealthLog && !hasCircuitLog && !hasErrorLog) {
      console.log(colors.green + '- No significant connectivity issues found in recent logs' + colors.reset);
    }
  } catch (error) {
    console.log(colors.red + 'Error accessing Docker logs: ' + error.message + colors.reset);
  }
}

// Main function
async function main() {
  console.log(colors.cyan + '\nConnectivity Fix Diagnostics Tool' + colors.reset);
  console.log(colors.cyan + 'Running diagnostics at ' + new Date().toISOString() + colors.reset);
  
  try {
    await checkConfiguration();
    await checkMiddlewareUpdates();
    await checkHealthEndpoints();
    await testConnectivity();
    await checkLogs();
    
    console.log('\n' + colors.green + '✅ Diagnostics completed.' + colors.reset);
    console.log(colors.white + 'If you still experience connectivity issues, please check:' + colors.reset);
    console.log(colors.white + '1. Docker network configurations' + colors.reset);
    console.log(colors.white + '2. Service environment variables' + colors.reset);
    console.log(colors.white + '3. Firewall settings' + colors.reset);
    console.log(colors.white + '4. Full logs using `docker-compose logs questionnaire-service`' + colors.reset);
  } catch (error) {
    console.error('\n' + colors.red + '❌ Diagnostics failed: ' + error.message + colors.reset);
  }
}

// Run diagnostics
main();
