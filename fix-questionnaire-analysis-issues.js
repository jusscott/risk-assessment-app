/**
 * Fix for questionnaire-analysis issues:
 * 1. Fix case sensitivity issue with questions field in submitQuestionnaire
 * 2. Add the enhanced client pattern for analysis service connectivity
 */

const fs = require('fs');
const path = require('path');

// Path to the submission controller
const submissionControllerPath = path.join(
  __dirname, 
  'backend', 
  'questionnaire-service', 
  'src', 
  'controllers', 
  'submission.controller.js'
);

// Read the current file content
let content = fs.readFileSync(submissionControllerPath, 'utf8');

// 1. Fix the lowercase 'questions' to uppercase 'Question' in schema relationship
content = content.replace(
  /Template: {\n\s+include: {\n\s+questions: {/g,
  'Template: {\n      include: {\n        Question: {'
);

// 2. Update the analysis service connection to use the enhanced client pattern
// First import the enhanced client
if (!content.includes('const enhancedClient')) {
  // Add enhanced client import at the top of the file, after the existing imports
  content = content.replace(
    'const config = require(\'../config/config\');\n',
    'const config = require(\'../config/config\');\nconst { createEnhancedClient } = require(\'../utils/enhanced-client\');\n\n// Create enhanced client for analysis service communications\nconst analysisClient = createEnhancedClient(\'analysis-service\', {\n  baseURL: config.analysisService.url,\n  timeout: 5000,\n  circuitBreakerThreshold: config.connection?.circuitBreakerThreshold || 5,\n  resetTimeout: config.connection?.circuitBreakerResetTimeout || 30000\n});\n'
  );
}

// 3. Replace direct axios calls to analysis service with enhanced client
content = content.replace(
  /const analysisResponse = await axios\.get\(\s+`\${config\.analysisService\.url}\/results\/\${submission\.id}`/g,
  'const analysisResponse = await analysisClient.get(`/results/${submission.id}`'
);

// 4. Update the notification to analysis service to use enhanced client
content = content.replace(
  /await axios\.post\(\s+`\${config\.analysisService\.url}\/api\/webhooks\/questionnaire-completed`/g,
  'await analysisClient.post(`/api/webhooks/questionnaire-completed`'
);

// Write the updated content back to the file
fs.writeFileSync(submissionControllerPath, content);

console.log('Fixed questionnaire-analysis issues in submission controller.');

// Check if enhanced-client exists, create if it doesn't
const enhancedClientPath = path.join(
  __dirname, 
  'backend', 
  'questionnaire-service', 
  'src', 
  'utils', 
  'enhanced-client.js'
);

// Create enhanced client if doesn't exist or is not properly set up
if (!fs.existsSync(enhancedClientPath)) {
  const enhancedClientContent = `/**
 * Enhanced client utility for resilient service communication
 */
const axios = require('axios');

/**
 * Create an enhanced HTTP client with circuit-breaker pattern
 * 
 * @param {string} serviceName - Name of the service being connected to
 * @param {object} options - Configuration options
 * @returns {object} - Enhanced axios client with circuit breaker
 */
function createEnhancedClient(serviceName, options = {}) {
  // Default options
  const config = {
    baseURL: '',
    timeout: 5000,
    circuitBreakerThreshold: 5,
    resetTimeout: 30000,
    ...options
  };

  // Circuit breaker state
  let state = {
    isOpen: false,
    failureCount: 0,
    lastFailureTime: null
  };

  // Create axios instance
  const instance = axios.create({
    baseURL: config.baseURL,
    timeout: config.timeout
  });

  // Check if circuit breaker is open
  const isCircuitOpen = async () => {
    if (state.isOpen) {
      const now = Date.now();
      if (now - state.lastFailureTime > config.resetTimeout) {
        // Try to close the circuit after reset timeout
        console.log(\`[EnhancedClient] Attempting to close circuit for \${serviceName}\`);
        state.isOpen = false;
        state.failureCount = 0;
        return false;
      }
      return true;
    }
    return false;
  };

  // Wrap instance methods to add circuit breaker
  const wrapped = {};
  ['get', 'post', 'put', 'delete', 'patch'].forEach(method => {
    wrapped[method] = async (...args) => {
      // Check if circuit is open
      const circuitOpen = await isCircuitOpen();
      if (circuitOpen) {
        console.log(\`[EnhancedClient] Circuit is open for \${serviceName}, failing fast\`);
        throw new Error(\`Service \${serviceName} is unavailable. Circuit is open.\`);
      }

      try {
        // Make the actual request
        const response = await instance[method](...args);
        // Reset failure count on success
        if (state.failureCount > 0) {
          console.log(\`[EnhancedClient] Successful request to \${serviceName}, resetting failure count\`);
          state.failureCount = 0;
        }
        return response;
      } catch (error) {
        // Handle errors and manage circuit state
        console.error(\`[EnhancedClient] Error in request to \${serviceName}: \${error.message}\`);
        state.failureCount++;
        state.lastFailureTime = Date.now();

        if (state.failureCount >= config.circuitBreakerThreshold) {
          console.log(\`[EnhancedClient] Circuit opened for \${serviceName} after \${state.failureCount} failures\`);
          state.isOpen = true;
        }

        throw error;
      }
    };
  });

  // Add method to check circuit state
  wrapped.isCircuitOpen = isCircuitOpen;
  
  // Add method to reset circuit
  wrapped.resetCircuit = () => {
    console.log(\`[EnhancedClient] Manually resetting circuit for \${serviceName}\`);
    state.isOpen = false;
    state.failureCount = 0;
  };

  return wrapped;
}

module.exports = {
  createEnhancedClient
};
`;

  // Write the enhanced client module
  fs.writeFileSync(enhancedClientPath, enhancedClientContent);
  console.log('Created enhanced client utility module.');
} else {
  console.log('Enhanced client utility already exists.');
}

// Make sure the utils directory exists
const utilsDir = path.join(__dirname, 'backend', 'questionnaire-service', 'src', 'utils');
if (!fs.existsSync(utilsDir)) {
  fs.mkdirSync(utilsDir, { recursive: true });
  console.log('Created utils directory structure.');
}

console.log('Successfully updated questionnaire service code to fix issues:');
console.log('1. Fixed case sensitivity issue with questions field');
console.log('2. Implemented enhanced client pattern for analysis service connectivity');
console.log('3. Added resilient connection handling with circuit breaking');
