/**
 * Enhanced Connectivity Fix for Questionnaire Service
 * 
 * This script addresses intermittent connection issues between services by:
 * 1. Implementing connection pooling with retry logic
 * 2. Adding circuit breaker patterns to avoid cascading failures
 * 3. Setting up health check endpoints and monitoring
 * 4. Optimizing connection timeouts and keep-alive settings
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
  maxRetries: 5,
  retryDelay: 1000,
  connectionTimeout: 5000,
  keepAliveTimeout: 60000,
  circuitBreakerThreshold: 3,
  serviceDependencies: [
    { name: 'auth-service', url: process.env.AUTH_SERVICE_URL || 'http://auth-service:3001' },
    { name: 'analysis-service', url: process.env.ANALYSIS_SERVICE_URL || 'http://analysis-service:3003' },
    { name: 'report-service', url: process.env.REPORT_SERVICE_URL || 'http://report-service:3004' }
  ]
};

// Enhanced request client with retry logic and circuit breaker
class EnhancedClient {
  constructor() {
    this.failureCounters = {};
    this.circuitOpen = {};
    this.lastHealthChecks = {};
    
    // Create axios instance with enhanced settings
    this.client = axios.create({
      timeout: CONFIG.connectionTimeout,
      headers: { 'Connection': 'keep-alive' },
      maxContentLength: 50 * 1024 * 1024 // 50MB
    });
    
    // Initialize counters for each service
    CONFIG.serviceDependencies.forEach(service => {
      this.failureCounters[service.name] = 0;
      this.circuitOpen[service.name] = false;
      this.lastHealthChecks[service.name] = Date.now();
    });
  }
  
  // Perform request with retry logic and circuit breaker
  async request(serviceName, config) {
    // Check if circuit is open (failing)
    if (this.circuitOpen[serviceName]) {
      const timeSinceLastCheck = Date.now() - this.lastHealthChecks[serviceName];
      
      // Try to reset circuit after 30 seconds
      if (timeSinceLastCheck > 30000) {
        console.log(`Attempting to reset circuit for ${serviceName}...`);
        await this.checkHealth(serviceName);
      } else {
        throw new Error(`Circuit open for ${serviceName} - service appears to be down`);
      }
    }
    
    // Attempt the request with retries
    let lastError;
    for (let attempt = 0; attempt < CONFIG.maxRetries; attempt++) {
      try {
        const response = await this.client(config);
        
        // Success - reset failure counter
        this.failureCounters[serviceName] = 0;
        return response;
      } catch (error) {
        lastError = error;
        console.warn(`Request to ${serviceName} failed (attempt ${attempt + 1}/${CONFIG.maxRetries}):`, error.message);
        
        // Increment failure counter
        this.failureCounters[serviceName]++;
        
        // Check if circuit breaker threshold reached
        if (this.failureCounters[serviceName] >= CONFIG.circuitBreakerThreshold) {
          this.circuitOpen[serviceName] = true;
          console.error(`Circuit breaker triggered for ${serviceName} after ${CONFIG.circuitBreakerThreshold} failures`);
        }
        
        // Wait before retry
        if (attempt < CONFIG.maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, CONFIG.retryDelay));
        }
      }
    }
    
    throw lastError || new Error(`Failed to communicate with ${serviceName} after ${CONFIG.maxRetries} attempts`);
  }
  
  // Check health of a service
  async checkHealth(serviceName) {
    const service = CONFIG.serviceDependencies.find(s => s.name === serviceName);
    if (!service) throw new Error(`Unknown service: ${serviceName}`);
    
    try {
      this.lastHealthChecks[serviceName] = Date.now();
      
      // Try to connect to the service's health endpoint
      await this.client({
        method: 'get',
        url: `${service.url}/health`,
        timeout: 2000 // Shorter timeout for health checks
      });
      
      // If successful, reset circuit
      this.circuitOpen[serviceName] = false;
      this.failureCounters[serviceName] = 0;
      console.log(`${serviceName} is healthy, circuit closed`);
      return true;
    } catch (error) {
      console.error(`Health check failed for ${serviceName}:`, error.message);
      return false;
    }
  }
}

// Function to update service configuration
async function updateServiceConfig() {
  const configPath = path.join(__dirname, '../src/config/config.js');
  console.log('Updating service configuration...');
  
  try {
    let configContent = fs.readFileSync(configPath, 'utf8');
    
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
  },`
      );
      
      fs.writeFileSync(configPath, configContent, 'utf8');
      console.log('Enhanced connectivity settings added to configuration.');
    }
  } catch (error) {
    console.error('Failed to update service configuration:', error);
    process.exit(1);
  }
}

// Function to add health check endpoint
async function addHealthEndpoint() {
  const indexPath = path.join(__dirname, '../src/index.js');
  console.log('Adding health check endpoint...');
  
  try {
    let indexContent = fs.readFileSync(indexPath, 'utf8');
    
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
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

` + afterInsert;
        
        fs.writeFileSync(indexPath, indexContent, 'utf8');
        console.log('Health check endpoint added.');
      }
    }
  } catch (error) {
    console.error('Failed to add health endpoint:', error);
    process.exit(1);
  }
}

// Function to update service dependencies
async function updateServiceDependencies() {
  const packagePath = path.join(__dirname, '../package.json');
  console.log('Updating service dependencies...');
  
  try {
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    
    // Check if we already have the retry and circuit breaker libraries
    let dependenciesUpdated = false;
    
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
      console.log('Dependencies updated, installing new packages...');
      
      try {
        execSync('npm install', { cwd: path.join(__dirname, '..'), stdio: 'inherit' });
        console.log('Dependencies installed successfully.');
      } catch (error) {
        console.error('Failed to install dependencies:', error.message);
        console.log('Please run "npm install" manually in the questionnaire service directory.');
      }
    } else {
      console.log('Dependencies already up to date.');
    }
  } catch (error) {
    console.error('Failed to update service dependencies:', error);
    process.exit(1);
  }
}

// Function to create enhanced client utility
async function createEnhancedClientUtility() {
  const utilDir = path.join(__dirname, '../src/utils');
  const clientPath = path.join(utilDir, 'enhanced-client.js');
  
  console.log('Creating enhanced client utility...');
  
  try {
    // Ensure utils directory exists
    if (!fs.existsSync(utilDir)) {
      fs.mkdirSync(utilDir, { recursive: true });
    }
    
    // Check if utility already exists
    if (fs.existsSync(clientPath)) {
      console.log('Enhanced client utility already exists.');
    } else {
      // Content for the enhanced client utility
      const clientContent = `/**
 * Enhanced API Client with retry logic and circuit breaker pattern
 */
const axios = require('axios');
const axiosRetry = require('axios-retry');
const CircuitBreaker = require('opossum');
const config = require('../config/config');

class EnhancedClient {
  constructor() {
    // Create base axios client
    this.axios = axios.create({
      timeout: config.enhancedConnectivity?.connectionTimeout || 5000
    });
    
    // Configure retry logic
    axiosRetry(this.axios, {
      retries: config.enhancedConnectivity?.maxRetries || 3,
      retryDelay: (retryCount) => {
        const delay = config.enhancedConnectivity?.retryDelay || 1000;
        return retryCount * delay;
      },
      retryCondition: (error) => {
        // Retry on network errors or 5xx responses
        return axiosRetry.isNetworkError(error) || 
          (error.response && error.response.status >= 500);
      }
    });
    
    // Circuit breaker options
    this.circuitOptions = {
      timeout: 10000, // Time in milliseconds to wait for the function to complete
      errorThresholdPercentage: 50, // When 50% of requests fail, trip the circuit
      resetTimeout: 30000 // Time in milliseconds to wait before trying the function again
    };
    
    this.breakers = {};
  }

  // Get or create circuit breaker for a given service
  getBreaker(serviceName, requestFn) {
    if (!this.breakers[serviceName]) {
      this.breakers[serviceName] = new CircuitBreaker(requestFn, this.circuitOptions);
      
      // Add listeners
      this.breakers[serviceName].on('open', () => {
        console.warn(\`Circuit breaker for \${serviceName} opened - service appears to be having issues\`);
      });
      
      this.breakers[serviceName].on('close', () => {
        console.log(\`Circuit breaker for \${serviceName} closed - service has recovered\`);
      });
      
      this.breakers[serviceName].on('halfOpen', () => {
        console.log(\`Circuit breaker for \${serviceName} is half-open - testing if service has recovered\`);
      });
    }
    
    return this.breakers[serviceName];
  }

  // Make request with circuit breaker pattern
  async request(serviceName, options) {
    const requestFn = async () => {
      try {
        const response = await this.axios(options);
        return response;
      } catch (error) {
        // Enhance error with service information
        error.serviceName = serviceName;
        throw error;
      }
    };
    
    const breaker = this.getBreaker(serviceName, requestFn);
    return breaker.fire();
  }

  // Check health of a service
  async checkHealth(serviceUrl) {
    try {
      const response = await this.axios.get(\`\${serviceUrl}/health\`);
      return response.data.status === 'ok';
    } catch (error) {
      return false;
    }
  }
}

// Export singleton instance
module.exports = new EnhancedClient();
`;
      
      fs.writeFileSync(clientPath, clientContent, 'utf8');
      console.log('Enhanced client utility created.');
    }
  } catch (error) {
    console.error('Failed to create enhanced client utility:', error);
    process.exit(1);
  }
}

// Function to update auth middleware to use the enhanced client
async function updateAuthMiddleware() {
  const authMiddlewarePath = path.join(__dirname, '../src/middlewares/auth.middleware.js');
  console.log('Updating auth middleware...');
  
  try {
    if (!fs.existsSync(authMiddlewarePath)) {
      console.log('Auth middleware not found, skipping update.');
      return;
    }
    
    let authMiddlewareContent = fs.readFileSync(authMiddlewarePath, 'utf8');
    
    // Check if already updated to use enhanced client
    if (authMiddlewareContent.includes('enhanced-client')) {
      console.log('Auth middleware already updated to use enhanced client.');
    } else {
      // Replace axios with enhanced client
      authMiddlewareContent = authMiddlewareContent.replace(
        "const axios = require('axios');",
        "const enhancedClient = require('../utils/enhanced-client');"
      );
      
      // Replace axios requests with enhanced client
      authMiddlewareContent = authMiddlewareContent.replace(
        /axios\.(?:get|post|put|delete)\([^)]+\)/g, 
        (match) => {
          // Extract URL and options
          const argsMatch = match.match(/axios\.(get|post|put|delete)\(([^)]+)\)/);
          if (argsMatch) {
            const method = argsMatch[1];
            const args = argsMatch[2];
            return `enhancedClient.request('auth-service', { method: '${method}', ${args.includes('{') ? args : `url: ${args}`} })`;
          }
          return match;
        }
      );
      
      fs.writeFileSync(authMiddlewarePath, authMiddlewareContent, 'utf8');
      console.log('Auth middleware updated to use enhanced client.');
    }
  } catch (error) {
    console.error('Failed to update auth middleware:', error);
    process.exit(1);
  }
}

// Function to update optimized auth middleware
async function updateOptimizedAuthMiddleware() {
  const optimizedAuthPath = path.join(__dirname, '../src/middlewares/optimized-auth.middleware.js');
  console.log('Updating optimized auth middleware...');
  
  try {
    if (!fs.existsSync(optimizedAuthPath)) {
      console.log('Optimized auth middleware not found, skipping update.');
      return;
    }
    
    let optimizedAuthContent = fs.readFileSync(optimizedAuthPath, 'utf8');
    
    // Check if already updated to use enhanced client
    if (optimizedAuthContent.includes('enhanced-client')) {
      console.log('Optimized auth middleware already updated to use enhanced client.');
    } else {
      // Replace axios with enhanced client
      optimizedAuthContent = optimizedAuthContent.replace(
        "const axios = require('axios');",
        "const enhancedClient = require('../utils/enhanced-client');"
      );
      
      // Replace axios requests with enhanced client
      optimizedAuthContent = optimizedAuthContent.replace(
        /axios\.(?:get|post|put|delete)\([^)]+\)/g, 
        (match) => {
          // Extract URL and options
          const argsMatch = match.match(/axios\.(get|post|put|delete)\(([^)]+)\)/);
          if (argsMatch) {
            const method = argsMatch[1];
            const args = argsMatch[2];
            return `enhancedClient.request('auth-service', { method: '${method}', ${args.includes('{') ? args : `url: ${args}`} })`;
          }
          return match;
        }
      );
      
      fs.writeFileSync(optimizedAuthPath, optimizedAuthContent, 'utf8');
      console.log('Optimized auth middleware updated to use enhanced client.');
    }
  } catch (error) {
    console.error('Failed to update optimized auth middleware:', error);
    process.exit(1);
  }
}

// Main function to run all updates
async function main() {
  console.log('Starting Enhanced Connectivity Fix for Questionnaire Service...');
  
  try {
    await updateServiceConfig();
    await addHealthEndpoint();
    await updateServiceDependencies();
    await createEnhancedClientUtility();
    await updateAuthMiddleware();
    await updateOptimizedAuthMiddleware();
    
    console.log('\nEnhanced Connectivity Fix completed successfully!');
    console.log('To apply these changes, please restart the questionnaire service.');
  } catch (error) {
    console.error('Enhanced Connectivity Fix failed:', error);
    process.exit(1);
  }
}

// Run the main function
main();
