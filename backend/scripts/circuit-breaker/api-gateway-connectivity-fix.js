/**
 * API Gateway Circuit Breaker Implementation
 * 
 * This script implements the circuit breaker pattern for the API Gateway.
 * As the central point of communication, the API Gateway needs robust
 * circuit breaker patterns to handle failures in downstream services.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Path constants
const SERVICE_ROOT = path.join(__dirname, '../../api-gateway');
const CONFIG_PATH = path.join(SERVICE_ROOT, 'src/config/config.js');
const UTILS_DIR = path.join(SERVICE_ROOT, 'src/utils');
const ENHANCED_CLIENT_PATH = path.join(UTILS_DIR, 'enhanced-client.js');
const HEALTH_ENDPOINT_PATH = path.join(SERVICE_ROOT, 'src/index.js');
const PROXY_MIDDLEWARE_PATH = path.join(SERVICE_ROOT, 'src/middlewares/proxy.middleware.js');

// Configuration for circuit breaker
const CONFIG = {
  maxRetries: 3,
  retryDelay: 1000,
  connectionTimeout: 5000,
  keepAliveTimeout: 60000,
  circuitBreakerThreshold: 3,
  resetTimeout: 30000,
  errorThresholdPercentage: 50,
  serviceDependencies: [
    { name: 'auth-service', url: process.env.AUTH_SERVICE_URL || 'http://auth-service:3001' },
    { name: 'questionnaire-service', url: process.env.QUESTIONNAIRE_SERVICE_URL || 'http://questionnaire-service:3002' },
    { name: 'analysis-service', url: process.env.ANALYSIS_SERVICE_URL || 'http://analysis-service:3003' },
    { name: 'report-service', url: process.env.REPORT_SERVICE_URL || 'http://report-service:3004' },
    { name: 'payment-service', url: process.env.PAYMENT_SERVICE_URL || 'http://payment-service:3005' }
  ]
};

/**
 * Update service configuration to include circuit breaker settings
 */
async function updateServiceConfig() {
  console.log('Updating API Gateway configuration...');
  
  try {
    // Create config file if it doesn't exist
    if (!fs.existsSync(CONFIG_PATH)) {
      const configDir = path.dirname(CONFIG_PATH);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      
      const initialConfig = `
/**
 * API Gateway Configuration
 */
module.exports = {
  port: process.env.PORT || 3000,
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
  res.status(200).json({ status: 'ok', service: 'api-gateway', timestamp: new Date().toISOString() });
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
  console.log('Updating API Gateway dependencies...');
  
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
    
    // Since API Gateway needs to proxy requests, ensure http-proxy is installed
    if (!packageJson.dependencies['http-proxy']) {
      packageJson.dependencies['http-proxy'] = '^1.18.1';
      dependenciesUpdated = true;
    }
    
    if (dependenciesUpdated) {
      fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2), 'utf8');
      console.log('Dependencies updated. You will need to run "npm install" in the API Gateway directory.');
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
      console.log('Enhanced client utility copied to API Gateway.');
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
 * API Gateway Service Client with Circuit Breaker
 * 
 * Pre-configured enhanced client for API Gateway to communicate with other services.
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
  logPrefix: '[ApiGateway]'
});

// Service URLs
const SERVICE_URLS = {
  AUTH: process.env.AUTH_SERVICE_URL || 'http://auth-service:3001',
  QUESTIONNAIRE: process.env.QUESTIONNAIRE_SERVICE_URL || 'http://questionnaire-service:3002',
  ANALYSIS: process.env.ANALYSIS_SERVICE_URL || 'http://analysis-service:3003',
  REPORT: process.env.REPORT_SERVICE_URL || 'http://report-service:3004',
  PAYMENT: process.env.PAYMENT_SERVICE_URL || 'http://payment-service:3005'
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
 * Make request to Questionnaire Service
 * @param {Object} options - Request options
 * @returns {Promise<Object>} Response data
 */
async function callQuestionnaireService(options) {
  return serviceClient.request('questionnaire-service', {
    ...options,
    baseURL: SERVICE_URLS.QUESTIONNAIRE,
    healthCheckUrl: \`\${SERVICE_URLS.QUESTIONNAIRE}/health\`
  });
}

/**
 * Make request to Analysis Service
 * @param {Object} options - Request options
 * @returns {Promise<Object>} Response data
 */
async function callAnalysisService(options) {
  return serviceClient.request('analysis-service', {
    ...options,
    baseURL: SERVICE_URLS.ANALYSIS,
    healthCheckUrl: \`\${SERVICE_URLS.ANALYSIS}/health\`
  });
}

/**
 * Make request to Report Service
 * @param {Object} options - Request options
 * @returns {Promise<Object>} Response data
 */
async function callReportService(options) {
  return serviceClient.request('report-service', {
    ...options,
    baseURL: SERVICE_URLS.REPORT,
    healthCheckUrl: \`\${SERVICE_URLS.REPORT}/health\`
  });
}

/**
 * Make request to Payment Service
 * @param {Object} options - Request options
 * @returns {Promise<Object>} Response data
 */
async function callPaymentService(options) {
  return serviceClient.request('payment-service', {
    ...options,
    baseURL: SERVICE_URLS.PAYMENT,
    healthCheckUrl: \`\${SERVICE_URLS.PAYMENT}/health\`
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
 * Get service URL by service name
 * @param {string} serviceName - Name of the service
 * @returns {string} Service URL
 */
function getServiceUrl(serviceName) {
  switch (serviceName.toLowerCase()) {
    case 'auth':
    case 'auth-service':
      return SERVICE_URLS.AUTH;
    case 'questionnaire':
    case 'questionnaire-service':
      return SERVICE_URLS.QUESTIONNAIRE;
    case 'analysis':
    case 'analysis-service':
      return SERVICE_URLS.ANALYSIS;
    case 'report':
    case 'report-service':
      return SERVICE_URLS.REPORT;
    case 'payment':
    case 'payment-service':
      return SERVICE_URLS.PAYMENT;
    default:
      throw new Error(\`Unknown service name: \${serviceName}\`);
  }
}

/**
 * Make a request to a specific service
 * @param {string} serviceName - Name of the service
 * @param {Object} options - Request options
 * @returns {Promise<Object>} Response data
 */
async function callService(serviceName, options) {
  const serviceUrl = getServiceUrl(serviceName);
  return serviceClient.request(serviceName, {
    ...options,
    baseURL: serviceUrl,
    healthCheckUrl: \`\${serviceUrl}/health\`
  });
}

/**
 * Check health of a specific service
 * @param {string} serviceName - Name of the service
 * @returns {Promise<Object>} Health check result
 */
async function checkServiceHealth(serviceName) {
  try {
    const serviceUrl = getServiceUrl(serviceName);
    const response = await serviceClient.request(serviceName, {
      method: 'get',
      url: '/health',
      baseURL: serviceUrl,
      healthCheckUrl: \`\${serviceUrl}/health\`,
      timeout: 2000
    });
    return {
      service: serviceName,
      status: 'up',
      details: response.data
    };
  } catch (error) {
    return {
      service: serviceName,
      status: 'down',
      error: error.message
    };
  }
}

/**
 * Check health of all services
 * @returns {Promise<Object>} Health check results for all services
 */
async function checkAllServicesHealth() {
  const services = ['auth-service', 'questionnaire-service', 'analysis-service', 'report-service', 'payment-service'];
  const results = await Promise.all(
    services.map(service => checkServiceHealth(service).catch(error => ({
      service,
      status: 'down',
      error: error.message
    })))
  );
  
  return {
    timestamp: new Date().toISOString(),
    gateway: { status: 'up' },
    services: results.reduce((acc, result) => {
      acc[result.service] = result;
      return acc;
    }, {})
  };
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
  callQuestionnaireService,
  callAnalysisService,
  callReportService,
  callPaymentService,
  callService,
  verifyToken,
  checkServiceHealth,
  checkAllServicesHealth,
  getCircuitStatus,
  getServiceUrl,
  SERVICE_URLS
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
          '});\n\n' +
          '// Services health check endpoint\n' +
          'app.get(\'/services/health\', async (req, res) => {\n' +
          '  const healthStatus = await serviceClient.checkAllServicesHealth();\n' +
          '  res.status(200).json(healthStatus);\n' +
          '});\n' +
          indexContent.substring(healthEndpointEnd);
        
        fs.writeFileSync(HEALTH_ENDPOINT_PATH, indexContent, 'utf8');
        console.log('Circuit breaker diagnostic and services health endpoints added.');
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
 * Update proxy middleware to use circuit breaker
 */
async function updateProxyMiddleware() {
  console.log('Updating proxy middleware to use circuit breaker...');
  
  try {
    if (!fs.existsSync(PROXY_MIDDLEWARE_PATH)) {
      console.error('Proxy middleware file not found. Please create it first.');
      process.exit(1);
    }
    
    let proxyContent = fs.readFileSync(PROXY_MIDDLEWARE_PATH, 'utf8');
    
    // Check if we've already updated the proxy middleware
    if (proxyContent.includes('service-client')) {
      console.log('Proxy middleware already updated to use circuit breaker.');
      return;
    }
    
    // Create an enhanced proxy middleware that uses the circuit breaker
    const enhancedProxyContent = `/**
 * Enhanced Proxy Middleware with Circuit Breaker
 * 
 * This middleware proxies requests to the appropriate backend service
 * with built-in circuit breaker pattern to handle service failures gracefully.
 */
const httpProxy = require('http-proxy');
const serviceClient = require('../utils/service-client');
const { getServiceUrl } = serviceClient;
const config = require('../config/config');
const serviceUrlConfig = require('../config/service-url.config');
const pathRewriteConfig = require('../config/path-rewrite.config');

// Create proxy server
const proxy = httpProxy.createProxyServer({
  changeOrigin: true,
  proxyTimeout: config.enhancedConnectivity?.connectionTimeout || 5000
});

// Error handling for proxy
proxy.on('error', (err, req, res) => {
  console.error('Proxy error:', err);
  
  if (!res.headersSent) {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      error: 'Proxy error', 
      message: 'Service is currently unavailable',
      details: config.environment === 'development' ? err.message : undefined,
      timestamp: new Date().toISOString()
    }));
  }
});

/**
 * Determine target service from request path
 * @param {string} path - Request path
 * @returns {string} Service name
 */
function determineService(path) {
  for (const [prefix, service] of Object.entries(serviceUrlConfig)) {
    if (path.startsWith(prefix)) {
      return service;
    }
  }
  return null;
}

/**
 * Rewrite path based on configuration
 * @param {string} path - Original path
 * @returns {string} Rewritten path
 */
function rewritePath(path) {
  for (const [prefix, rewriteConfig] of Object.entries(pathRewriteConfig)) {
    if (path.startsWith(prefix)) {
      return path.replace(prefix, rewriteConfig.target);
    }
  }
  return path;
}

/**
 * Check if circuit is open for a service
 * @param {string} serviceName - Name of the service
 * @returns {boolean} True if circuit is open
 */
function isCircuitOpen(serviceName) {
  const circuitStatus = serviceClient.getCircuitStatus();
  return circuitStatus[serviceName]?.status === 'open';
}

/**
 * Proxy middleware
 */
module.exports = (req, res, next) => {
  const serviceName = determineService(req.path);
  
  if (!serviceName) {
    console.warn(\`No service mapping found for path: \${req.path}\`);
    return next();
  }
  
  // Check if circuit is open for the service
  if (isCircuitOpen(serviceName)) {
    console.warn(\`Circuit is open for service: \${serviceName}, returning fallback response\`);
    res.status(503).json({
      error: 'Service Unavailable',
      message: 'The service is temporarily unavailable. Please try again later.',
      timestamp: new Date().toISOString()
    });
    return;
  }
  
  try {
    // Rewrite path if needed
    const rewrittenPath = rewritePath(req.path);
    req.url = rewrittenPath;
    
    // Get target URL
    const target = getServiceUrl(serviceName);
    
    // Proxy the request
    proxy.web(req, res, { target });
  } catch (error) {
    console.error(\`Proxy error for service \${serviceName}:\`, error);
    res.status(502).json({
      error: 'Bad Gateway',
      message: 'Error proxying to service',
      timestamp: new Date().toISOString()
    });
  }
};
`;
    
    fs.writeFileSync(PROXY_MIDDLEWARE_PATH, enhancedProxyContent, 'utf8');
    console.log('Proxy middleware updated to use circuit breaker.');
  } catch (error) {
    console.error('Failed to update proxy middleware:', error);
    process.exit(1);
  }
}

/**
 * Create a dedicated endpoint for manually resetting circuits
 */
async function addCircuitResetEndpoint() {
  console.log('Adding circuit reset endpoint...');
  
  try {
    if (!fs.existsSync(HEALTH_ENDPOINT_PATH)) {
      console.error('Index file not found. Please create it first.');
      process.exit(1);
    }
    
    let indexContent = fs.readFileSync(HEALTH_ENDPOINT_PATH, 'utf8');
    
    // Check if we've already added the circuit reset endpoint
    if (indexContent.includes('app.post(\'/circuit-reset\'')) {
      console.log('Circuit reset endpoint already exists.');
    } else {
      // Find a good insertion point - after the circuit status endpoint
      const circuitStatusEndpoint = indexContent.indexOf('app.get(\'/circuit-status\'');
      if (circuitStatusEndpoint !== -1) {
        // Find the end of the circuit status endpoint
        const circuitStatusEnd = indexContent.indexOf('});', circuitStatusEndpoint) + 3;
        
        indexContent = 
          indexContent.substring(0, circuitStatusEnd) + 
          '\n\n// Circuit reset endpoint - admin only\n' +
          'app.post(\'/circuit-reset\', (req, res) => {\n' +
          '  // In a production environment, this should have strong authentication\n' +
          '  const serviceName = req.body.service;\n' +
          '  \n' +
          '  if (!serviceName) {\n' +
          '    return res.status(400).json({ error: \'Service name is required\' });\n' +
          '  }\n' +
          '  \n' +
          '  try {\n' +
          '    const result = serviceClient.resetCircuit(serviceName);\n' +
          '    res.status(200).json({ result });\n' +
          '  } catch (error) {\n' +
          '    res.status(500).json({ error: error.message });\n' +
          '  }\n' +
          '});\n' +
          indexContent.substring(circuitStatusEnd);
        
        fs.writeFileSync(HEALTH_ENDPOINT_PATH, indexContent, 'utf8');
        console.log('Circuit reset endpoint added.');
        
        // Need to add resetCircuit method to service-client.js
        const serviceClientPath = path.join(UTILS_DIR, 'service-client.js');
        if (fs.existsSync(serviceClientPath)) {
          let serviceClientContent = fs.readFileSync(serviceClientPath, 'utf8');
          
          // Check if resetCircuit method already exists
          if (!serviceClientContent.includes('resetCircuit')) {
            // Find the exports section to add the new method
            const exportsIndex = serviceClientContent.lastIndexOf('module.exports');
            if (exportsIndex !== -1) {
              // Find the closing brace of the exports object
              const exportsClosingBrace = serviceClientContent.indexOf('};', exportsIndex);
              
              if (exportsClosingBrace !== -1) {
                // Add the resetCircuit method
                const resetCircuitMethod = `
/**
 * Reset circuit for a specific service
 * @param {string} serviceName - Name of the service to reset
 * @returns {Object} Result of the reset operation
 */
function resetCircuit(serviceName) {
  return serviceClient.resetCircuit(serviceName);
}`;
                
                // Add method to export
                const updatedServiceClientContent = 
                  serviceClientContent.substring(0, exportsClosingBrace - 1) + 
                  ',\n  resetCircuit' +
                  serviceClientContent.substring(exportsClosingBrace - 1);
                
                // Insert the method before exports
                const insertPoint = updatedServiceClientContent.lastIndexOf('/**', exportsIndex);
                const finalServiceClientContent = 
                  updatedServiceClientContent.substring(0, insertPoint) + 
                  resetCircuitMethod + 
                  '\n\n' +
                  updatedServiceClientContent.substring(insertPoint);
                
                fs.writeFileSync(serviceClientPath, finalServiceClientContent, 'utf8');
                console.log('Added resetCircuit method to service client.');
              }
            }
          }
        }
      } else {
        console.warn('Could not find circuit status endpoint. Manual addition of circuit reset endpoint required.');
      }
    }
  } catch (error) {
    console.error('Failed to add circuit reset endpoint:', error);
    process.exit(1);
  }
}

/**
 * Main function to run all updates
 */
async function main() {
  console.log('Starting API Gateway Circuit Breaker Implementation...');
  
  try {
    await updateServiceConfig();
    await addHealthEndpoint();
    await updateServiceDependencies();
    await copyEnhancedClientUtility();
    await createServiceImplementation();
    await addCircuitBreakerDiagnosticEndpoint();
    await updateProxyMiddleware();
    await addCircuitResetEndpoint();
    
    console.log('\nAPI Gateway Circuit Breaker Implementation completed successfully!');
    console.log('To apply these changes:');
    console.log('1. Run "npm install" in the API Gateway directory');
    console.log('2. Restart the API Gateway');
    console.log('3. Test the /health, /circuit-status, and /services/health endpoints');
  } catch (error) {
    console.error('Implementation failed:', error);
    process.exit(1);
  }
}

// Run the main function
main();
