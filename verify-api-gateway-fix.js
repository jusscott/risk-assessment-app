/**
 * This script verifies the API Gateway fix by checking if the exported logRateLimitInfo
 * function is available from the rate-limit.middleware module
 */

const path = require('path');
const fs = require('fs');

// Set paths
const basePath = path.join(__dirname, 'backend', 'api-gateway', 'src');
const middlewarePath = path.join(basePath, 'middlewares', 'rate-limit.middleware.js');

console.log('Verifying API Gateway rate limiting fix...');

// First, check if the file exists
if (!fs.existsSync(middlewarePath)) {
  console.error(`Error: File not found: ${middlewarePath}`);
  process.exit(1);
}

// Try to load the middleware module
try {
  const rateLimitMiddleware = require(middlewarePath);
  
  // Check if logRateLimitInfo is exported
  if (typeof rateLimitMiddleware.logRateLimitInfo === 'function') {
    console.log('✅ Success: logRateLimitInfo is now properly exported from the rate-limit middleware!');
    console.log('The API Gateway should now start without errors.');
  } else {
    console.error('❌ Error: logRateLimitInfo is not exported correctly from the middleware.');
    console.error('Check that the module.exports in rate-limit.middleware.js includes logRateLimitInfo.');
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Error loading the rate-limit middleware:', error.message);
  process.exit(1);
}

console.log('\nNext steps:');
console.log('1. Run the restart script: ./restart-api-gateway.sh');
console.log('2. Monitor the API Gateway logs for any remaining issues');
console.log('3. Verify that authentication endpoints are working properly');
