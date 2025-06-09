/**
 * Fix for questionnaire service restart issues
 * 
 * This script addresses multiple issues that may be causing the questionnaire service
 * to get stuck in a restart loop:
 * 
 * 1. Ensures enhanced-client.js syntax is correctly fixed
 * 2. Resolves potential circular dependency issues between enhanced-client.js and enhanced-client-wrapper.js
 * 3. Fixes module resolution issues when loading Circuit Breaker dependencies
 * 4. Adds additional error handling and logging for analysis service connections
 */

const fs = require('fs');
const path = require('path');

// Paths for key files
const BASE_DIR = path.resolve(__dirname);
const QUESTIONNAIRE_DIR = path.join(BASE_DIR, 'backend/questionnaire-service');
const ENHANCED_CLIENT_PATH = path.join(QUESTIONNAIRE_DIR, 'src/utils/enhanced-client.js');
const ENHANCED_CLIENT_WRAPPER_PATH = path.join(QUESTIONNAIRE_DIR, 'src/utils/enhanced-client-wrapper.js');
const SUBMISSION_CONTROLLER_PATH = path.join(QUESTIONNAIRE_DIR, 'src/controllers/submission.controller.js');
const INDEX_PATH = path.join(QUESTIONNAIRE_DIR, 'src/index.js');
const AUTH_MIDDLEWARE_PATH = path.join(QUESTIONNAIRE_DIR, 'src/middlewares/auth.middleware.js');

// Step 1: Fix the enhanced client syntax and improve error handling
function fixEnhancedClient() {
  console.log('Fixing enhanced-client.js...');
  
  try {
    let content = fs.readFileSync(ENHANCED_CLIENT_PATH, 'utf8');
    
    // Fix the constructor syntax issue if it exists
    content = content.replace(
      /\/\/ Create base axios client\s+this\.axios = axios\.create\(/,
      `// Create base axios client
    this.axios = axios.create(`
    );
    
    // Add proper error handling for getBreaker
    content = content.replace(
      /getBreaker\(serviceName, requestFn\) {/,
      `getBreaker(serviceName, requestFn) {
    if (!serviceName) {
      console.warn('Warning: getBreaker called without serviceName, using "unknown-service"');
      serviceName = 'unknown-service';
    }
    if (!requestFn) {
      console.warn('Warning: getBreaker called without requestFn, using empty function');
      requestFn = async () => ({});
    }`
    );

    // Add better error handling for isAuthCircuitOpen
    content = content.replace(
      /async isAuthCircuitOpen\(\) {/,
      `async isAuthCircuitOpen() {
    try {`
    );

    content = content.replace(
      /return global\.circuitBreakerState\.authCircuitOpen;/,
      `return global?.circuitBreakerState?.authCircuitOpen || false;
    } catch (error) {
      console.error('Error checking circuit breaker state:', error);
      return false;
    }`
    );
    
    // Add validation for service URL in checkHealth
    content = content.replace(
      /async checkHealth\(serviceUrl\) {/,
      `async checkHealth(serviceUrl) {
    if (!serviceUrl) {
      console.warn('Warning: checkHealth called without serviceUrl');
      return false;
    }`
    );

    // Add robust error handling for request method
    content = content.replace(
      /async request\(serviceName, options\) {/,
      `async request(serviceName, options) {
    if (!serviceName) {
      console.warn('Warning: request called without serviceName, using "unknown-service"');
      serviceName = 'unknown-service';
    }
    if (!options) {
      console.warn('Warning: request called without options, using empty object');
      options = {};
    }`
    );
    
    fs.writeFileSync(ENHANCED_CLIENT_PATH, content);
    console.log('✅ Enhanced client fixes applied successfully');
  } catch (error) {
    console.error('❌ Failed to fix enhanced-client.js:', error);
    throw error;
  }
}

// Step 2: Fix enhanced client wrapper to prevent circular dependency issues
function fixEnhancedClientWrapper() {
  console.log('Fixing enhanced-client-wrapper.js...');
  
  try {
    let content = fs.readFileSync(ENHANCED_CLIENT_WRAPPER_PATH, 'utf8');
    
    // Improve module loading with additional directories to search
    content = content.replace(
      /const possiblePaths = \[/,
      `const possiblePaths = [
  path.resolve(__dirname, './enhanced-client.js'),
  path.resolve(__dirname, '../utils/enhanced-client.js'),`
    );
    
    // Add better error handling when creating EventAwareEnhancedClient
    content = content.replace(
      /authServiceClient = new EventAwareEnhancedClient\({/,
      `try {
  authServiceClient = new EventAwareEnhancedClient({`
    );
    
    content = content.replace(
      /console\.log\('Successfully initialized auth service client'\);/,
      `console.log('Successfully initialized auth service client');
} catch (error) {
  console.error('Failed to initialize auth service client:', error);
  // Create a minimal fallback client that won't break the app
  authServiceClient = {
    isAuthCircuitOpen: () => false,
    getAuthServiceStatus: () => 'unknown'
  };
}`
    );
    
    fs.writeFileSync(ENHANCED_CLIENT_WRAPPER_PATH, content);
    console.log('✅ Enhanced client wrapper fixes applied successfully');
  } catch (error) {
    console.error('❌ Failed to fix enhanced-client-wrapper.js:', error);
    throw error;
  }
}

// Step 3: Fix the submission controller to address case sensitivity and connectivity issues
function fixSubmissionController() {
  console.log('Fixing submission.controller.js...');
  
  try {
    let content = fs.readFileSync(SUBMISSION_CONTROLLER_PATH, 'utf8');
    
    // Fix any remaining case sensitivity issues with Prisma queries
    content = content.replace(
      /questions: {/g,
      `Question: {`
    );
    
    // Improve error handling for analysis service communication
    content = content.replace(
      /const analysisResponse = await axios\.get\(/,
      `try {
      const analysisResponse = await axios.get(`
    );
    
    if (!content.includes('try {')) {
      content = content.replace(
        /const analysisResponse = await analysisClient\.get\(/,
        `try {
      const analysisResponse = await analysisClient.get(`
      );
    }
    
    if (!content.includes('catch (error) {')) {
      // Add robust error handling for analysis service communication
      content = content.replace(
        /return analysisResponse\.data;/,
        `return analysisResponse.data;
    } catch (error) {
      console.error('Error connecting to analysis service:', error.message);
      // Return a basic response structure to prevent complete failure
      return {
        questionnaire: submission.id,
        status: 'error',
        error: error.message,
        results: []
      };
    }`
      );
    }
    
    fs.writeFileSync(SUBMISSION_CONTROLLER_PATH, content);
    console.log('✅ Submission controller fixes applied successfully');
  } catch (error) {
    console.error('❌ Failed to fix submission.controller.js:', error);
    throw error;
  }
}

// Step 4: Fix index.js to improve error handling during startup
function fixIndex() {
  console.log('Fixing index.js...');
  
  try {
    let content = fs.readFileSync(INDEX_PATH, 'utf8');
    
    // Add error handling for event emitter initialization
    if (!content.includes('try {')) {
      content = content.replace(
        /\/\/ Safely initialize event emitter system/,
        `// Safely initialize event emitter system
try {`
      );
    }
    
    // Fix authServiceClient check in health endpoint
    content = content.replace(
      /const authCircuitStatus = typeof authServiceClient\.isAuthCircuitOpen === 'function' \? /,
      `const authCircuitStatus = authServiceClient && typeof authServiceClient.isAuthCircuitOpen === 'function' ? `
    );
    
    // Add better error handling for importing Enhanced Client
    content = content.replace(
      /\/\/ Import the auth service client after event emitter setup/,
      `// Import the auth service client after event emitter setup
let authServiceClient;
try {
  const enhancedClientWrapper = require('./utils/enhanced-client-wrapper');
  authServiceClient = enhancedClientWrapper.authServiceClient;
} catch (error) {
  console.error('Error importing enhanced client wrapper:', error);
  // Create fallback auth service client
  authServiceClient = {
    isAuthCircuitOpen: () => false,
    getAuthServiceStatus: () => 'unknown'
  };
}`
    );
    
    // Remove the original import that might be failing
    content = content.replace(
      /const \{ authServiceClient \} = require\('\.\/utils\/enhanced-client-wrapper'\);/,
      `// Original import replaced with try/catch version above`
    );
    
    fs.writeFileSync(INDEX_PATH, content);
    console.log('✅ Index fixes applied successfully');
  } catch (error) {
    console.error('❌ Failed to fix index.js:', error);
    throw error;
  }
}

// Step 5: Fix auth middleware to ensure no duplicate circuit breaker checks
function fixAuthMiddleware() {
  console.log('Fixing auth.middleware.js...');
  
  try {
    let content = fs.readFileSync(AUTH_MIDDLEWARE_PATH, 'utf8');
    
    // Replace duplicate circuit breaker checks with a single check
    // Count occurrences of authCircuitOpen checks
    const occurrences = (content.match(/Track if auth service circuit breaker is open/g) || []).length;
    
    if (occurrences > 1) {
      // Find the position of the first and second occurrences
      const firstPos = content.indexOf('Track if auth service circuit breaker is open');
      const secondPos = content.indexOf('Track if auth service circuit breaker is open', firstPos + 1);
      
      if (firstPos >= 0 && secondPos >= 0) {
        // Find the end of the second block
        const secondEndPos = content.indexOf('if (authCircuitOpen) {', secondPos);
        const nextEndPos = content.indexOf('}', secondEndPos);
        
        // Remove the second block completely
        content = content.substring(0, secondPos - 4) + content.substring(nextEndPos + 1);
      }
    }
    
    // Add error handling for enhancedClient call
    content = content.replace(
      /const authCircuitOpen = await enhancedClient\.isAuthCircuitOpen\(\);/,
      `let authCircuitOpen = false;
    try {
      authCircuitOpen = await enhancedClient?.isAuthCircuitOpen?.() || false;
    } catch (error) {
      console.error('Error checking auth circuit status:', error);
    }`
    );
    
    // Avoid null reference by checking if enhancedClient exists
    content = content.replace(
      /const enhancedClient = require\('\.\.\/utils\/enhanced-client'\);/,
      `let enhancedClient;
try {
  enhancedClient = require('../utils/enhanced-client');
} catch (error) {
  console.error('Failed to load enhanced-client:', error);
  enhancedClient = {
    isAuthCircuitOpen: async () => false
  };
}`
    );
    
    fs.writeFileSync(AUTH_MIDDLEWARE_PATH, content);
    console.log('✅ Auth middleware fixes applied successfully');
  } catch (error) {
    console.error('❌ Failed to fix auth.middleware.js:', error);
    throw error;
  }
}

// Main function to run all fixes
async function runFixes() {
  console.log('🔧 Starting questionnaire service restart issue fixes...');
  
  try {
    // Apply all fixes
    fixEnhancedClient();
    fixEnhancedClientWrapper();
    fixSubmissionController();
    fixAuthMiddleware();
    fixIndex();
    
    console.log('✅ All fixes applied successfully!');
    console.log('➡️ Next steps:');
    console.log('  1. Restart the questionnaire service using ./restart-questionnaire-service-fixed.sh');
    console.log('  2. Check service logs to confirm successful startup');
  } catch (error) {
    console.error('❌ Failed to apply fixes:', error);
    process.exit(1);
  }
}

// Run the fixes
runFixes();
