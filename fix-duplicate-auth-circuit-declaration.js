/**
 * This script fixes the duplicate 'authCircuitOpen' declaration error
 * in the questionnaire service by ensuring the variable is only defined once
 * and shared properly across modules.
 */

const fs = require('fs');
const path = require('path');

// Define the base path to the questionnaire service
const basePath = path.join(__dirname, 'backend/questionnaire-service');

// Fix the enhanced-client-wrapper.js file to use a shared variable
function fixEnhancedClientWrapper() {
  const filePath = path.join(basePath, 'src/utils/enhanced-client-wrapper.js');
  
  console.log(`Reading ${filePath}`);
  const content = fs.readFileSync(filePath, 'utf8');

  // Check if the file contains the problematic code
  if (!content.includes('isAuthCircuitOpen')) {
    console.log('The enhanced client wrapper file doesn\'t contain the expected code. Skipping.');
    return;
  }

  // Update the code to use a safer pattern for sharing circuit state
  const updatedContent = content.replace(
    // Create and export a singleton instance for the auth service with safer initialization
    /let authServiceClient;[\s\S]*?try[\s\S]*?authServiceClient = new EventAwareEnhancedClient[\s\S]*?console\.log\('Successfully initialized auth service client'\);[\s\S]*?} catch \(error\) {[\s\S]*?console\.error\('Failed to initialize auth service client:',[\s\S]*?error[\s\S]*?\);[\s\S]*?\/\/ Create a minimal fallback client that won't break the app[\s\S]*?authServiceClient = {[\s\S]*?isAuthCircuitOpen: \(\) => false,[\s\S]*?getAuthServiceStatus: \(\) => 'unknown'[\s\S]*?};[\s\S]*?}[\s\S]*?module\.exports = {/,
    `// Define a shared state object for circuit breaker status
const circuitBreakerState = {
  authCircuitOpen: false
};

// Create and export a singleton instance for the auth service with safer initialization
let authServiceClient;
try {
  authServiceClient = new EventAwareEnhancedClient({
    maxRetries: 2,
    retryDelay: 1000,
    connectionTimeout: 3000, 
    circuitBreakerThreshold: 3,
    resetTimeout: 30000,
    enableLogging: true,
    logPrefix: '[AuthServiceClient]'
  });
  
  // Override the isAuthCircuitOpen method to use the shared state
  authServiceClient.isAuthCircuitOpen = () => {
    return circuitBreakerState.authCircuitOpen;
  };
  
  // Add a method to update the state
  authServiceClient.setAuthCircuitOpen = (isOpen) => {
    circuitBreakerState.authCircuitOpen = isOpen;
  };
  
  console.log('Successfully initialized auth service client');
} catch (error) {
  console.error('Failed to initialize auth service client:', error);
  // Create a minimal fallback client that won't break the app
  authServiceClient = {
    isAuthCircuitOpen: () => circuitBreakerState.authCircuitOpen,
    setAuthCircuitOpen: (isOpen) => { circuitBreakerState.authCircuitOpen = isOpen; },
    getAuthServiceStatus: () => 'unknown'
  };
}

module.exports = {
  // Export the shared circuit breaker state
  circuitBreakerState,`
  );

  // Update the event emitter to use the shared state
  const updatedContent2 = updatedContent.replace(
    /breaker\.on\('open', \(\) => {[\s\S]*?if \(this\.authServiceStatus !== 'open'\) {[\s\S]*?console\.log\('🔴 Auth service circuit breaker OPENED - emitting event'\);[\s\S]*?this\.authServiceStatus = 'open';[\s\S]*?this\.eventEmitter\.emit\('circuit-open', { service: 'auth-service' }\);[\s\S]*?process\.env\.CIRCUIT_BREAKER_FALLBACK_ENABLED = 'true';[\s\S]*?}/,
    `breaker.on('open', () => {
        if (this.authServiceStatus !== 'open') {
          console.log('🔴 Auth service circuit breaker OPENED - emitting event');
          this.authServiceStatus = 'open';
          // Use the shared state
          circuitBreakerState.authCircuitOpen = true;
          this.eventEmitter.emit('circuit-open', { service: 'auth-service' });
          process.env.CIRCUIT_BREAKER_FALLBACK_ENABLED = 'true';
        }`
  );

  const updatedContent3 = updatedContent2.replace(
    /breaker\.on\('close', \(\) => {[\s\S]*?if \(this\.authServiceStatus !== 'closed'\) {[\s\S]*?console\.log\('🟢 Auth service circuit breaker CLOSED - emitting event'\);[\s\S]*?this\.authServiceStatus = 'closed';[\s\S]*?this\.eventEmitter\.emit\('circuit-close', { service: 'auth-service' }\);[\s\S]*?process\.env\.CIRCUIT_BREAKER_FALLBACK_ENABLED = 'false';[\s\S]*?}/,
    `breaker.on('close', () => {
        if (this.authServiceStatus !== 'closed') {
          console.log('🟢 Auth service circuit breaker CLOSED - emitting event');
          this.authServiceStatus = 'closed';
          // Use the shared state
          circuitBreakerState.authCircuitOpen = false;
          this.eventEmitter.emit('circuit-close', { service: 'auth-service' });
          process.env.CIRCUIT_BREAKER_FALLBACK_ENABLED = 'false';
        }`
  );

  console.log(`Writing updated content to ${filePath}`);
  fs.writeFileSync(filePath, updatedContent3);
  console.log('Enhanced client wrapper fixed!');
}

// Fix the main index.js file to use the updated pattern
function fixIndexJs() {
  const filePath = path.join(basePath, 'src/index.js');
  
  console.log(`Reading ${filePath}`);
  const content = fs.readFileSync(filePath, 'utf8');

  // Update the health check endpoint to use the shared state
  const updatedContent = content.replace(
    // Check auth service circuit breaker status
    /const authCircuitStatus = authServiceClient\.isAuthCircuitOpen \? [\s\S]*?authServiceClient\.isAuthCircuitOpen\(\) : [\s\S]*?process\.env\.CIRCUIT_BREAKER_FALLBACK_ENABLED === 'true';/,
    `// Use the safe method to check circuit breaker status
  const authCircuitStatus = authServiceClient.isAuthCircuitOpen();`
  );

  console.log(`Writing updated content to ${filePath}`);
  fs.writeFileSync(filePath, updatedContent);
  console.log('Main index.js fixed!');
}

// Run the fixes
try {
  console.log('Starting to fix the duplicate authCircuitOpen declaration issue...');
  fixEnhancedClientWrapper();
  fixIndexJs();
  console.log('Fix completed successfully!');
} catch (error) {
  console.error('Error applying fix:', error);
  process.exit(1);
}
