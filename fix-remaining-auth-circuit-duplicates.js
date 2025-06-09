/**
 * This script provides a more comprehensive fix for the duplicate 'authCircuitOpen' declaration issue
 * It ensures there's only one source of truth for the circuit breaker state by properly
 * implementing the global state pattern across all relevant files.
 */

const fs = require('fs');
const path = require('path');

// Define the base path to the questionnaire service
const basePath = path.join(__dirname, 'backend/questionnaire-service');

// Store files that might declare or use authCircuitOpen
const filesToCheck = [
  'src/utils/enhanced-client-wrapper.js',
  'src/index.js',
  'src/utils/enhanced-client.js',
  'src/middlewares/optimized-auth.middleware.js',
  'src/middlewares/auth.middleware.js',
  'src/routes/health.routes.js'
];

// Check files for authCircuitOpen declarations
function findAuthCircuitOpenDeclarations() {
  console.log('Searching for authCircuitOpen declarations...');
  
  filesToCheck.forEach(relativeFilePath => {
    const filePath = path.join(basePath, relativeFilePath);
    
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Look for variable declarations
      const declarationRegex = /(const|let|var)\s+authCircuitOpen\s*=/g;
      const matches = content.match(declarationRegex);
      
      if (matches) {
        console.log(`Found ${matches.length} declaration(s) in ${relativeFilePath}`);
      }
      
      // Look for usage
      if (content.includes('authCircuitOpen') && !matches) {
        console.log(`File ${relativeFilePath} uses authCircuitOpen but doesn't declare it`);
      }
    }
  });
}

// Fix the enhanced-client-wrapper.js file to use a shared global state
function fixEnhancedClientWrapper() {
  const filePath = path.join(basePath, 'src/utils/enhanced-client-wrapper.js');
  
  if (!fs.existsSync(filePath)) {
    console.log(`File ${filePath} doesn't exist. Skipping.`);
    return;
  }
  
  console.log(`Reading ${filePath}`);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Remove any potential local declaration of authCircuitOpen
  content = content.replace(/const\s+authCircuitOpen\s*=.*?;/g, '// Using global circuitBreakerState instead');
  content = content.replace(/let\s+authCircuitOpen\s*=.*?;/g, '// Using global circuitBreakerState instead');
  content = content.replace(/var\s+authCircuitOpen\s*=.*?;/g, '// Using global circuitBreakerState instead');
  
  // Ensure we have proper initialization of global state object
  if (!content.includes('global.circuitBreakerState')) {
    // Add global state initialization if missing
    content = content.replace('// Create global event emitter and state objects if they don\'t exist',
    `// Create global event emitter and state objects if they don't exist
if (!global.circuitBreakerState) {
  global.circuitBreakerState = {
    authCircuitOpen: false
  };
}`);
  } else {
    // Make sure authCircuitOpen is properly initialized in the state object
    if (!content.includes('circuitBreakerState.authCircuitOpen')) {
      content = content.replace('global.circuitBreakerState = {',
      'global.circuitBreakerState = {\n    authCircuitOpen: false,');
    }
  }
  
  // Update any direct references to authCircuitOpen to use global.circuitBreakerState.authCircuitOpen
  content = content.replace(/authCircuitOpen\s*=/g, 'global.circuitBreakerState.authCircuitOpen =');
  content = content.replace(/authCircuitOpen\s*===/g, 'global.circuitBreakerState.authCircuitOpen ===');
  content = content.replace(/authCircuitOpen\s*==/g, 'global.circuitBreakerState.authCircuitOpen ==');
  
  // Update isAuthCircuitOpen method to use the global state
  content = content.replace(
    /isAuthCircuitOpen\(\) {[^}]*}/g,
    'isAuthCircuitOpen() {\n    return global.circuitBreakerState.authCircuitOpen;\n  }'
  );
  
  // If there's a setAuthCircuitOpen method, update it to use the global state
  if (content.includes('setAuthCircuitOpen')) {
    content = content.replace(
      /setAuthCircuitOpen\(isOpen\) {[^}]*}/g,
      'setAuthCircuitOpen(isOpen) {\n    global.circuitBreakerState.authCircuitOpen = isOpen;\n  }'
    );
  } else {
    // Add a setAuthCircuitOpen method if it doesn't exist
    content = content.replace(
      'isAuthCircuitOpen() {',
      'isAuthCircuitOpen() {\n    return global.circuitBreakerState.authCircuitOpen;\n  },\n  setAuthCircuitOpen(isOpen) {\n    global.circuitBreakerState.authCircuitOpen = isOpen;\n  }'
    );
  }
  
  console.log(`Writing updated content to ${filePath}`);
  fs.writeFileSync(filePath, content);
}

// Fix the index.js file to use the global state properly
function fixIndexJs() {
  const filePath = path.join(basePath, 'src/index.js');
  
  if (!fs.existsSync(filePath)) {
    console.log(`File ${filePath} doesn't exist. Skipping.`);
    return;
  }
  
  console.log(`Reading ${filePath}`);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Update the health check endpoint to use the authServiceClient.isAuthCircuitOpen method
  content = content.replace(
    /const authCircuitStatus = .*?\?[\s\S]*?authServiceClient\.isAuthCircuitOpen\(\)[\s\S]*?:[\s\S]*?process\.env\.CIRCUIT_BREAKER_FALLBACK_ENABLED === 'true';/g,
    `const authCircuitStatus = typeof authServiceClient.isAuthCircuitOpen === 'function' ? 
    authServiceClient.isAuthCircuitOpen() : 
    (process.env.CIRCUIT_BREAKER_FALLBACK_ENABLED === 'true');`
  );
  
  console.log(`Writing updated content to ${filePath}`);
  fs.writeFileSync(filePath, content);
}

// Ensure auth.middleware.js doesn't create duplicate declarations
function fixAuthMiddleware() {
  const filePath = path.join(basePath, 'src/middlewares/auth.middleware.js');
  
  if (!fs.existsSync(filePath)) {
    console.log(`File ${filePath} doesn't exist. Skipping.`);
    return;
  }
  
  console.log(`Reading ${filePath}`);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Remove any potential local declaration of authCircuitOpen
  content = content.replace(/const\s+authCircuitOpen\s*=.*?;/g, '// Using global circuitBreakerState instead');
  content = content.replace(/let\s+authCircuitOpen\s*=.*?;/g, '// Using global circuitBreakerState instead');
  content = content.replace(/var\s+authCircuitOpen\s*=.*?;/g, '// Using global circuitBreakerState instead');
  
  // Update any direct references to authCircuitOpen to use global.circuitBreakerState.authCircuitOpen
  content = content.replace(/authCircuitOpen\s*=/g, 'global.circuitBreakerState.authCircuitOpen =');
  content = content.replace(/return\s+authCircuitOpen/g, 'return global.circuitBreakerState.authCircuitOpen');
  
  console.log(`Writing updated content to ${filePath}`);
  fs.writeFileSync(filePath, content);
}

// Fix the optimized-auth.middleware.js to properly use the circuit breaker state
function fixOptimizedAuthMiddleware() {
  const filePath = path.join(basePath, 'src/middlewares/optimized-auth.middleware.js');
  
  if (!fs.existsSync(filePath)) {
    console.log(`File ${filePath} doesn't exist. Skipping.`);
    return;
  }
  
  console.log(`Reading ${filePath}`);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Make sure it's importing the enhanced-client-wrapper correctly
  if (!content.includes('enhancedClient')) {
    console.log('Error: optimized-auth.middleware.js should import enhancedClient');
    return;
  }
  
  // Update any direct references to authCircuitOpen to use the client's method
  content = content.replace(/authCircuitOpen\s*=/g, '// Use client method instead of direct assignment');
  content = content.replace(/if\s*\(\s*authCircuitOpen\s*\)/g, 'if (enhancedClient.isAuthCircuitOpen())');
  
  console.log(`Writing updated content to ${filePath}`);
  fs.writeFileSync(filePath, content);
}

// Fix the enhanced-client.js file if it exists
function fixEnhancedClient() {
  const filePath = path.join(basePath, 'src/utils/enhanced-client.js');
  
  if (!fs.existsSync(filePath)) {
    console.log(`File ${filePath} doesn't exist. Skipping.`);
    return;
  }
  
  console.log(`Reading ${filePath}`);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Remove any potential local declaration of authCircuitOpen
  content = content.replace(/const\s+authCircuitOpen\s*=.*?;/g, '// Using global circuitBreakerState instead');
  content = content.replace(/let\s+authCircuitOpen\s*=.*?;/g, '// Using global circuitBreakerState instead');
  content = content.replace(/var\s+authCircuitOpen\s*=.*?;/g, '// Using global circuitBreakerState instead');
  
  // Initialize global state if needed
  if (!content.includes('global.circuitBreakerState')) {
    content = content.replace('class EnhancedClient {',
    `// Initialize global circuit breaker state if not already done
if (!global.circuitBreakerState) {
  global.circuitBreakerState = {
    authCircuitOpen: false
  };
}

class EnhancedClient {`);
  }
  
  // Add isAuthCircuitOpen method if it doesn't exist
  if (!content.includes('isAuthCircuitOpen')) {
    content = content.replace('checkHealth(serviceUrl) {',
    `isAuthCircuitOpen() {
    return global.circuitBreakerState.authCircuitOpen;
  }

  // Check health of a service
  checkHealth(serviceUrl) {`);
  }
  
  // Update breaker open/close events to use global state
  if (content.includes('this.breakers[serviceName].on(\'open\'')) {
    content = content.replace(
      /this\.breakers\[serviceName\]\.on\('open', \(\) => {([^}]*)}\);/g,
      `this.breakers[serviceName].on('open', () => {$1
        // Update global circuit state if this is the auth service
        if (serviceName === 'auth-service' && global.circuitBreakerState) {
          global.circuitBreakerState.authCircuitOpen = true;
        }
      });`
    );
  }
  
  if (content.includes('this.breakers[serviceName].on(\'close\'')) {
    content = content.replace(
      /this\.breakers\[serviceName\]\.on\('close', \(\) => {([^}]*)}\);/g,
      `this.breakers[serviceName].on('close', () => {$1
        // Update global circuit state if this is the auth service
        if (serviceName === 'auth-service' && global.circuitBreakerState) {
          global.circuitBreakerState.authCircuitOpen = false;
        }
      });`
    );
  }
  
  console.log(`Writing updated content to ${filePath}`);
  fs.writeFileSync(filePath, content);
}

// Run all the fixes
try {
  console.log('Starting to fix the duplicate authCircuitOpen declaration issue...');
  findAuthCircuitOpenDeclarations();
  fixEnhancedClientWrapper();
  fixIndexJs();
  fixAuthMiddleware();
  fixOptimizedAuthMiddleware();
  fixEnhancedClient();
  console.log('Fix completed successfully! You can now restart the service.');
} catch (error) {
  console.error('Error applying fix:', error);
  process.exit(1);
}
