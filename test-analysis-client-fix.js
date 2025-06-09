/**
 * Test script to verify the analysis client fix is working
 */
const path = require('path');

// Mock config to avoid loading actual config dependencies
const config = {
  analysisService: {
    url: 'http://analysis-service:5003'
  },
  enhancedConnectivity: {
    connectionTimeout: 10000,
    maxRetries: 3,
    retryDelay: 1000
  },
  connection: {
    circuitBreakerThreshold: 5,
    circuitBreakerResetTimeout: 30000
  }
};

// Mock the config module
require.cache[require.resolve('./backend/questionnaire-service/src/config/config')] = {
  exports: config
};

// Load the enhanced client
const { createEnhancedClient } = require('./backend/questionnaire-service/src/utils/enhanced-client');

console.log('Testing analysis client fix...');

// Create analysis client (same as in submission.controller.js)
const analysisClient = createEnhancedClient('analysis-service', {
  baseURL: config.analysisService?.url || 'http://analysis-service:5003',
  timeout: 5000,
  circuitBreakerThreshold: config.connection?.circuitBreakerThreshold || 5,
  resetTimeout: config.connection?.circuitBreakerResetTimeout || 30000
});

console.log('Analysis client created successfully');

// Test that required methods exist
const requiredMethods = ['get', 'post', 'put', 'delete', 'patch', 'request', 'isCircuitOpen', 'checkHealth'];
let allMethodsExist = true;

for (const method of requiredMethods) {
  if (typeof analysisClient[method] === 'function') {
    console.log(`✅ Method '${method}' exists and is a function`);
  } else {
    console.log(`❌ Method '${method}' is missing or not a function`);
    allMethodsExist = false;
  }
}

if (allMethodsExist) {
  console.log('\n🎉 SUCCESS: All required methods exist on the analysis client!');
  console.log('The "analysisClient.get is not a function" error should be resolved.');
  console.log('\nThe analysis client now provides:');
  console.log('- HTTP methods: get, post, put, delete, patch');
  console.log('- Circuit breaker functionality');
  console.log('- Health checking capabilities');
  console.log('- Enhanced retry logic');
  process.exit(0);
} else {
  console.log('\n❌ FAILED: Some required methods are missing');
  process.exit(1);
}
