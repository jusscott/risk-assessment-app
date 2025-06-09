/**
 * Payment Service Circuit Breaker Implementation
 * 
 * This script implements the circuit breaker pattern for the Payment Service.
 * It applies the enhanced client to improve service resilience and prevent
 * cascading failures during service outages.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Path constants
const SERVICE_ROOT = path.join(__dirname, '../../payment-service');
const CONFIG_PATH = path.join(SERVICE_ROOT, 'src/config/config.js');
const UTILS_DIR = path.join(SERVICE_ROOT, 'src/utils');
const ENHANCED_CLIENT_PATH = path.join(UTILS_DIR, 'enhanced-client.js');
const HEALTH_ENDPOINT_PATH = path.join(SERVICE_ROOT, 'src/index.js');

// Configuration for circuit breaker
const CONFIG = {
  maxRetries: 5,
  retryDelay: 1000,
  connectionTimeout: 5000,
  keepAliveTimeout: 60000,
  circuitBreakerThreshold: 3,
  resetTimeout: 30000,
  errorThresholdPercentage: 50,
  serviceDependencies: [
    { name: 'api-gateway', url: process.env.API_GATEWAY_URL || 'http://api-gateway:3000' },
    { name: 'auth-service', url: process.env.AUTH_SERVICE_URL || 'http://auth-service:3001' }
  ]
};

/**
 * Update service configuration to include circuit breaker settings
 */
async function updateServiceConfig() {
  console.log('Updating Payment Service configuration...');
  
  try {
    // Create config file if it doesn't exist
    if (!fs.existsSync(CONFIG_PATH)) {
      const configDir = path.dirname(CONFIG_PATH);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      
      const initialConfig = `
/**
 * Payment Service Configuration
 */
module.exports = {
  port: process.env.PORT || 3005,
  environment: process.env.NODE_ENV || 'development',
  logging: {
    level: process.env.LOG_LEVEL || 'info'
  }
};`;
      
      fs.writeFileSync(CONFIG_PATH, initialConfig, 'utf8');
      console.log('Created new configuration file.');
    }
    
    let configContent = fs.readFileSync(CONFIG_PATH, 'utf8');
    
    // Check if we've already applied the enhanced connectivity settings
    if (configContent.includes('enhancedConnectivity')) {
      console.log('Enhanced connectivity settings already applied.');
    } else {
      // Add the enhanced connectivity settings
      configContent = configContent.replace(
        'module.exports = {',
        `module.exports = {
  // Enhanced connectivity settings
  enhancedConnectivity: {
    enabled: true,
    maxRetries: ${CONFIG.maxRetries},
    retryDelay: ${CONFIG.retryDelay},
    connectionTimeout: ${CONFIG.connectionTimeout},
    keepAliveTimeout: ${CONFIG.keepAliveTimeout},
    circuitBreakerThreshold: ${CONFIG.circuitBreakerThreshold},
    resetTimeout: ${CONFIG.resetTimeout},
    errorThresholdPercentage: ${CONFIG.errorThresholdPercentage},
  },`
      );
      
      fs.writeFileSync(CONFIG_PATH, configContent, 'utf8');
      console.log('Enhanced connectivity settings added to configuration.');
    }
  } catch (error) {
    console.error('Failed to update service configuration:', error);
    process.exit(1);
  }
}

/**
 * Add health check endpoint
 */
async function addHealthEndpoint() {
  console.log('Adding health check endpoint...');
  
  try {
    if (!fs.existsSync(HEALTH_ENDPOINT_PATH)) {
      console.error('Index file not found. Please create it first.');
      process.exit(1);
    }
    
    let indexContent = fs.readFileSync(HEALTH_ENDPOINT_PATH, 'utf8');
    
    // Check if we've already added the health endpoint
    if (indexContent.includes('app.get(\'/health\'')) {
      console.log('Health endpoint already exists.');
    } else {
      // Add the health endpoint
      const insertPoint = indexContent.indexOf('app.use(');
      if (insertPoint !== -1) {
        const beforeInsert = indexContent.substring(0, insertPoint);
        const afterInsert = indexContent.substring(insertPoint);
        
        indexContent = beforeInsert + 
          `// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'payment-service', timestamp: new Date().toISOString() });
});

` + afterInsert;
        
        fs.writeFileSync(HEALTH_ENDPOINT_PATH, indexContent, 'utf8');
        console.log('Health check endpoint added.');
      } else {
        console.warn('Could not find insertion point for health endpoint. Manual addition required.');
      }
    }
  } catch (error) {
    console.error('Failed to add health endpoint:', error);
    process.exit(1);
  }
}

/**
 * Update package.json to include necessary dependencies
 */
async function updateServiceDependencies() {
  const packagePath = path.join(SERVICE_ROOT, 'package.json');
  console.log('Updating Payment Service dependencies...');
  
  try {
    if (!fs.existsSync(packagePath)) {
      console.error('package.json not found. Please create it first.');
      process.exit(1);
    }
    
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    
    // Check if we already have the circuit breaker libraries
    let dependenciesUpdated = false;
    
    if (!packageJson.dependencies) {
      packageJson.dependencies = {};
    }
    
    if (!packageJson.dependencies['axios']) {
      packageJson.dependencies['axios'] = '^0.26.1';
      dependenciesUpdated = true;
    }
    
    if (!packageJson.dependencies['axios-retry']) {
      packageJson.dependencies['axios-retry'] = '^3.3.1';
      dependenciesUpdated = true;
    }
    
    if (!packageJson.dependencies['opossum']) {
      packageJson.dependencies['opossum'] = '^6.4.0'; // Circuit breaker library
      dependenciesUpdated = true;
    }
    
    if (dependenciesUpdated) {
      fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2), 'utf8');
      console.log('Dependencies updated. You will need to run "npm install" in the payment service directory.');
    } else {
      console.log('Dependencies already up to date.');
    }
  } catch (error) {
    console.error('Failed to update service dependencies:', error);
    process.exit(1);
  }
}

/**
 * Copy the enhanced client utility to the service
 */
async function copyEnhancedClientUtility() {
  console.log('Setting up enhanced client utility...');
  
  try {
    // Ensure utils directory exists
    if (!fs.existsSync(UTILS_DIR)) {
      fs.mkdirSync(UTILS_DIR, { recursive: true });
    }
    
    // Check if utility already exists
    if (fs.existsSync(ENHANCED_CLIENT_PATH)) {
      console.log('Enhanced client utility already exists.');
    } else {
      // Read the shared enhanced client implementation
      const sharedClientPath = path.join(__dirname, 'enhanced-client.js');
      const clientContent = fs.readFileSync(sharedClientPath, 'utf8');
      
      // Create service-specific version
      fs.writeFileSync(ENHANCED_CLIENT_PATH, clientContent, 'utf8');
      console.log('Enhanced client utility copied to Payment Service.');
    }
  } catch (error) {
    console.error('Failed to set up enhanced client utility:', error);
    process.exit(1);
  }
}

/**
 * Create a service-specific implementation with pre-configured settings
 */
async function createServiceImplementation() {
  const implementationPath = path.join(UTILS_DIR, 'service-client.js');
  console.log('Creating service-specific client implementation...');
  
  try {
    const implementationContent = `/**
 * Payment Service Client with Circuit Breaker
 * 
 * Pre-configured enhanced client for Payment Service to communicate with other services.
 */
const EnhancedClient = require('./enhanced-client');
const config = require('../config/config');

// Create client with service-specific configuration
const serviceClient = new EnhancedClient({
  maxRetries: config.enhancedConnectivity?.maxRetries || 3,
  retryDelay: config.enhancedConnectivity?.retryDelay || 1000,
  connectionTimeout: config.enhancedConnectivity?.connectionTimeout || 5000,
  circuitBreakerThreshold: config.enhancedConnectivity?.circuitBreakerThreshold || 3,
  resetTimeout: config.enhancedConnectivity?.resetTimeout || 30000,
  errorThresholdPercentage: config.enhancedConnectivity?.errorThresholdPercentage || 50,
  logPrefix: '[PaymentService]'
});

// Service URLs
const SERVICE_URLS = {
  AUTH: process.env.AUTH_SERVICE_URL || 'http://auth-service:3001',
  API_GATEWAY: process.env.API_GATEWAY_URL || 'http://api-gateway:3000'
};

/**
 * Make request to Auth Service
 * @param {Object} options - Request options
 * @returns {Promise<Object>} Response data
 */
async function callAuthService(options) {
  return serviceClient.request('auth-service', {
    ...options,
    baseURL: SERVICE_URLS.AUTH,
    healthCheckUrl: \`\${SERVICE_URLS.AUTH}/health\`
  });
}

/**
 * Make request to API Gateway
 * @param {Object} options - Request options
 * @returns {Promise<Object>} Response data
 */
async function callApiGateway(options) {
  return serviceClient.request('api-gateway', {
    ...options,
    baseURL: SERVICE_URLS.API_GATEWAY,
    healthCheckUrl: \`\${SERVICE_URLS.API_GATEWAY}/health\`
  });
}

/**
 * Verify a JWT token with Auth Service
 * @param {string} token - JWT token to verify
 * @returns {Promise<Object>} Token verification result
 */
async function verifyToken(token) {
  try {
    const response = await callAuthService({
      method: 'post',
      url: '/api/auth/verify',
      data: { token }
    });
    return response.data;
  } catch (error) {
    throw new Error(\`Token verification failed: \${error.message}\`);
  }
}

/**
 * Get circuit status information
 * @returns {Object} Circuit status for all services
 */
function getCircuitStatus() {
  return serviceClient.getAllCircuitStatus();
}

module.exports = {
  callAuthService,
  callApiGateway,
  verifyToken,
  getCircuitStatus
};
`;
    
    fs.writeFileSync(implementationPath, implementationContent, 'utf8');
    console.log('Service-specific client implementation created.');
  } catch (error) {
    console.error('Failed to create service implementation:', error);
    process.exit(1);
  }
}

/**
 * Create circuit breaker diagnostic endpoint
 */
async function addCircuitBreakerDiagnosticEndpoint() {
  console.log('Adding circuit breaker diagnostic endpoint...');
  
  try {
    if (!fs.existsSync(HEALTH_ENDPOINT_PATH)) {
      console.error('Index file not found. Please create it first.');
      process.exit(1);
    }
    
    let indexContent = fs.readFileSync(HEALTH_ENDPOINT_PATH, 'utf8');
    
    // Check if we've already added the circuit breaker endpoint
    if (indexContent.includes('app.get(\'/circuit-status\'')) {
      console.log('Circuit breaker diagnostic endpoint already exists.');
    } else {
      // Import the service client
      if (!indexContent.includes('service-client')) {
        const importSection = indexContent.match(/require\([^\)]+\);/g);
        if (importSection && importSection.length > 0) {
          const lastImport = importSection[importSection.length - 1];
          const importIndex = indexContent.indexOf(lastImport) + lastImport.length;
          
          indexContent = 
            indexContent.substring(0, importIndex) + 
            '\nconst serviceClient = require(\'./utils/service-client\');' +
            indexContent.substring(importIndex);
        }
      }
      
      // Add the circuit breaker endpoint
      const healthEndpointIndex = indexContent.indexOf('app.get(\'/health\'');
      if (healthEndpointIndex !== -1) {
        // Find the end of the health endpoint
        const healthEndpointEnd = indexContent.indexOf('});', healthEndpointIndex) + 3;
        
        indexContent = 
          indexContent.substring(0, healthEndpointEnd) + 
          '\n\n// Circuit breaker status endpoint\n' +
          'app.get(\'/circuit-status\', (req, res) => {\n' +
          '  res.status(200).json(serviceClient.getCircuitStatus());\n' +
          '});\n' +
          indexContent.substring(healthEndpointEnd);
        
        fs.writeFileSync(HEALTH_ENDPOINT_PATH, indexContent, 'utf8');
        console.log('Circuit breaker diagnostic endpoint added.');
      } else {
        console.warn('Could not find health endpoint. Manual addition of circuit breaker endpoint required.');
      }
    }
  } catch (error) {
    console.error('Failed to add circuit breaker diagnostic endpoint:', error);
    process.exit(1);
  }
}

/**
 * Main function to run all updates
 */
async function main() {
  console.log('Starting Payment Service Circuit Breaker Implementation...');
  
  try {
    await updateServiceConfig();
    await addHealthEndpoint();
    await updateServiceDependencies();
    await copyEnhancedClientUtility();
    await createServiceImplementation();
    await addCircuitBreakerDiagnosticEndpoint();
    
    console.log('\nPayment Service Circuit Breaker Implementation completed successfully!');
    console.log('To apply these changes:');
    console.log('1. Run "npm install" in the payment service directory');
    console.log('2. Restart the payment service');
  } catch (error) {
    console.error('Implementation failed:', error);
    process.exit(1);
  }
}

// Run the main function
main();
