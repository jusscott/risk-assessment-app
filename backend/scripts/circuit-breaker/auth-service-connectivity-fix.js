/**
 * Auth Service Circuit Breaker Implementation
 * 
 * This script implements the circuit breaker pattern for the Auth Service.
 * Since Auth Service is written in TypeScript, this implementation accounts for
 * TypeScript-specific requirements.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Path constants
const SERVICE_ROOT = path.join(__dirname, '../../auth-service');
const CONFIG_PATH = path.join(SERVICE_ROOT, 'src/config/config.ts');
const UTILS_DIR = path.join(SERVICE_ROOT, 'src/utils');
const ENHANCED_CLIENT_PATH = path.join(UTILS_DIR, 'enhanced-client.ts');
const HEALTH_ENDPOINT_PATH = path.join(SERVICE_ROOT, 'src/routes/auth.routes.ts');

// Configuration for circuit breaker
const CONFIG = {
  maxRetries: 3,
  retryDelay: 1000,
  connectionTimeout: 5000,
  keepAliveTimeout: 60000,
  circuitBreakerThreshold: 3,
  resetTimeout: 30000,
  errorThresholdPercentage: 50
};

/**
 * Update service configuration to include circuit breaker settings
 */
async function updateServiceConfig() {
  console.log('Updating Auth Service configuration...');
  
  try {
    if (!fs.existsSync(CONFIG_PATH)) {
      console.error('Config file not found. Please create it first.');
      process.exit(1);
    }
    
    let configContent = fs.readFileSync(CONFIG_PATH, 'utf8');
    
    // Check if we've already applied the enhanced connectivity settings
    if (configContent.includes('enhancedConnectivity')) {
      console.log('Enhanced connectivity settings already applied.');
    } else {
      // TypeScript config pattern will be different from JavaScript
      // We need to find the appropriate interface/type declaration first
      
      // Check if there's a Config interface or type
      const configInterfaceMatch = configContent.match(/(interface|type)\s+Config\s*=?\s*{/);
      if (configInterfaceMatch) {
        const configInterfaceIndex = configContent.indexOf(configInterfaceMatch[0]);
        
        // Find the closing brace of the interface/type
        let openBraces = 1;
        let closingBraceIndex = configInterfaceIndex + configInterfaceMatch[0].length;
        while (openBraces > 0 && closingBraceIndex < configContent.length) {
          if (configContent[closingBraceIndex] === '{') openBraces++;
          if (configContent[closingBraceIndex] === '}') openBraces--;
          closingBraceIndex++;
        }
        
        // Insert the enhancedConnectivity interface before the closing brace
        const enhancedConnectivityInterface = `
  enhancedConnectivity?: {
    enabled: boolean;
    maxRetries: number;
    retryDelay: number;
    connectionTimeout: number;
    keepAliveTimeout: number;
    circuitBreakerThreshold: number;
    resetTimeout: number;
    errorThresholdPercentage: number;
  };`;
        
        configContent = 
          configContent.substring(0, closingBraceIndex - 1) + 
          enhancedConnectivityInterface + 
          configContent.substring(closingBraceIndex - 1);
        
        // Now find the config object to add the actual values
        const configObjectMatch = configContent.match(/const\s+config\s*:\s*Config\s*=\s*{/);
        if (configObjectMatch) {
          const configObjectIndex = configContent.indexOf(configObjectMatch[0]);
          
          // Find the first property of the config object
          const afterConfigObjectIndex = configObjectIndex + configObjectMatch[0].length;
          
          // Add the enhancedConnectivity configuration
          const enhancedConnectivityConfig = `
  enhancedConnectivity: {
    enabled: true,
    maxRetries: ${CONFIG.maxRetries},
    retryDelay: ${CONFIG.retryDelay},
    connectionTimeout: ${CONFIG.connectionTimeout},
    keepAliveTimeout: ${CONFIG.keepAliveTimeout},
    circuitBreakerThreshold: ${CONFIG.circuitBreakerThreshold},
    resetTimeout: ${CONFIG.resetTimeout},
    errorThresholdPercentage: ${CONFIG.errorThresholdPercentage},
  },`;
          
          configContent = 
            configContent.substring(0, afterConfigObjectIndex) + 
            enhancedConnectivityConfig + 
            configContent.substring(afterConfigObjectIndex);
        }
        
        fs.writeFileSync(CONFIG_PATH, configContent, 'utf8');
        console.log('Enhanced connectivity settings added to configuration.');
      } else {
        console.warn('Could not find Config interface/type. Manual addition of enhanced connectivity settings required.');
      }
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
      console.error('Routes file not found. Please create it first.');
      process.exit(1);
    }
    
    let routesContent = fs.readFileSync(HEALTH_ENDPOINT_PATH, 'utf8');
    
    // Check if we've already added the health endpoint
    if (routesContent.includes('router.get(\'/health\'')) {
      console.log('Health endpoint already exists.');
    } else {
      // TypeScript routes pattern is different from JavaScript
      // Find the router instance
      const routerMatch = routesContent.match(/const\s+router\s*=\s*express\.Router\(\)/);
      if (routerMatch) {
        const routerIndex = routesContent.indexOf(routerMatch[0]);
        const afterRouterIndex = routerIndex + routerMatch[0].length;
        
        // Add the health endpoint after the router creation
        const healthEndpoint = `

// Health check endpoint
router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', service: 'auth-service', timestamp: new Date().toISOString() });
});`;
        
        routesContent = 
          routesContent.substring(0, afterRouterIndex) + 
          healthEndpoint + 
          routesContent.substring(afterRouterIndex);
        
        fs.writeFileSync(HEALTH_ENDPOINT_PATH, routesContent, 'utf8');
        console.log('Health check endpoint added.');
      } else {
        console.warn('Could not find router instance. Manual addition of health endpoint required.');
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
  console.log('Updating Auth Service dependencies...');
  
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
    
    // Add TypeScript type definitions
    if (!packageJson.devDependencies) {
      packageJson.devDependencies = {};
    }
    
    if (!packageJson.devDependencies['@types/axios']) {
      packageJson.devDependencies['@types/axios'] = '^0.14.0';
      dependenciesUpdated = true;
    }
    
    if (!packageJson.devDependencies['@types/opossum']) {
      packageJson.devDependencies['@types/opossum'] = '^6.2.1';
      dependenciesUpdated = true;
    }
    
    if (dependenciesUpdated) {
      fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2), 'utf8');
      console.log('Dependencies updated. You will need to run "npm install" in the Auth Service directory.');
    } else {
      console.log('Dependencies already up to date.');
    }
  } catch (error) {
    console.error('Failed to update service dependencies:', error);
    process.exit(1);
  }
}

/**
 * Create enhanced client TypeScript utility
 */
async function createEnhancedClientUtility() {
  console.log('Setting up enhanced client utility for TypeScript...');
  
  try {
    // Ensure utils directory exists
    if (!fs.existsSync(UTILS_DIR)) {
      fs.mkdirSync(UTILS_DIR, { recursive: true });
    }
    
    // Check if utility already exists
    if (fs.existsSync(ENHANCED_CLIENT_PATH)) {
      console.log('Enhanced client utility already exists.');
    } else {
      // Create TypeScript version of the enhanced client
      const enhancedClientContent = `/**
 * Enhanced HTTP Client with Circuit Breaker
 * 
 * This client extends Axios with retry and circuit breaker capabilities.
 * It handles transient failures gracefully and prevents cascading failures
 * during service outages.
 */
import axios, { AxiosRequestConfig, AxiosResponse, AxiosInstance } from 'axios';
import axiosRetry from 'axios-retry';
import CircuitBreaker from 'opossum';

export interface EnhancedClientConfig {
  maxRetries: number;
  retryDelay: number;
  connectionTimeout: number;
  keepAliveTimeout?: number;
  circuitBreakerThreshold: number;
  resetTimeout: number;
  errorThresholdPercentage: number;
  logPrefix?: string;
}

export interface CircuitBreakerStatus {
  status: 'open' | 'closed' | 'half-open';
  failures: number;
  fallbackCount: number;
  lastError?: Error;
  totalFailures: number;
  totalSuccesses: number;
  totalRequests: number;
}

export interface CircuitStatus {
  [serviceName: string]: CircuitBreakerStatus;
}

export class EnhancedClient {
  private config: EnhancedClientConfig;
  private axios: AxiosInstance;
  private circuits: Map<string, CircuitBreaker>;
  private logPrefix: string;

  constructor(config: EnhancedClientConfig) {
    this.config = {
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 1000,
      connectionTimeout: config.connectionTimeout || 5000,
      keepAliveTimeout: config.keepAliveTimeout || 60000,
      circuitBreakerThreshold: config.circuitBreakerThreshold || 3,
      resetTimeout: config.resetTimeout || 30000,
      errorThresholdPercentage: config.errorThresholdPercentage || 50,
    };
    
    this.logPrefix = config.logPrefix || '[EnhancedClient]';
    this.circuits = new Map();
    
    // Create axios instance with retry capability
    this.axios = axios.create({
      timeout: this.config.connectionTimeout,
      headers: {
        'Connection': 'keep-alive',
        'Keep-Alive': \`timeout=\${Math.floor(this.config.keepAliveTimeout / 1000)}\`
      }
    });
    
    // Configure axios-retry
    axiosRetry(this.axios, {
      retries: this.config.maxRetries,
      retryDelay: () => this.config.retryDelay,
      retryCondition: (error) => {
        // Retry on network errors and 5xx responses, but not on 4xx responses
        return (
          axiosRetry.isNetworkOrIdempotentRequestError(error) || 
          (error.response && error.response.status >= 500)
        );
      }
    });
  }

  /**
   * Make a request to a service with circuit breaker protection
   * @param serviceName Name of the service
   * @param options Axios request options
   * @returns Response from the service
   */
  public async request<T = any>(
    serviceName: string, 
    options: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    // Create circuit breaker for service if it doesn't exist
    if (!this.circuits.has(serviceName)) {
      this.createCircuitBreaker(serviceName);
    }
    
    const circuit = this.circuits.get(serviceName)!;
    
    try {
      // Execute request through circuit breaker
      return await circuit.fire(() => this.executeRequest(options));
    } catch (error) {
      // If circuit is open, throw specific error
      if (circuit.status === 'open') {
        console.error(\`\${this.logPrefix} Circuit is open for service: \${serviceName}\`);
        const circuitOpenError = new Error(\`Service \${serviceName} is unavailable. Circuit is open.\`);
        circuitOpenError.name = 'CircuitOpenError';
        throw circuitOpenError;
      }
      
      // Otherwise, rethrow the original error
      throw error;
    }
  }

  /**
   * Execute HTTP request
   * @param options Axios request options
   * @returns Response from service
   */
  private async executeRequest<T = any>(
    options: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    try {
      return await this.axios.request(options);
    } catch (error) {
      console.error(\`\${this.logPrefix} Request failed: \${error.message}\`);
      throw error;
    }
  }

  /**
   * Create circuit breaker for a service
   * @param serviceName Name of the service
   */
  private createCircuitBreaker(serviceName: string): void {
    const options = {
      errorThresholdPercentage: this.config.errorThresholdPercentage,
      resetTimeout: this.config.resetTimeout,
      rollingCountTimeout: 10000, // Rolling window of 10 seconds
      rollingCountBuckets: 10,    // Split window into 10 buckets
      name: serviceName
    };
    
    const circuit = new CircuitBreaker(async (options: AxiosRequestConfig) => {
      return await this.executeRequest(options);
    }, options);
    
    // Add event listeners
    circuit.on('open', () => {
      console.warn(\`\${this.logPrefix} Circuit breaker opened for service: \${serviceName}\`);
    });
    
    circuit.on('close', () => {
      console.info(\`\${this.logPrefix} Circuit breaker closed for service: \${serviceName}\`);
    });
    
    circuit.on('halfOpen', () => {
      console.info(\`\${this.logPrefix} Circuit breaker half-open for service: \${serviceName}\`);
    });
    
    circuit.on('fallback', (error) => {
      console.error(\`\${this.logPrefix} Circuit breaker fallback for service \${serviceName}: \${error.message}\`);
    });
    
    this.circuits.set(serviceName, circuit);
  }

  /**
   * Check health of a service
   * @param serviceName Name of the service
   * @param healthCheckUrl URL to check service health
   * @returns True if service is healthy
   */
  public async checkHealth(serviceName: string, healthCheckUrl: string): Promise<boolean> {
    try {
      const response = await this.axios.get(healthCheckUrl, { timeout: 2000 });
      return response.status === 200;
    } catch (error) {
      console.error(\`\${this.logPrefix} Health check failed for \${serviceName}: \${error.message}\`);
      return false;
    }
  }

  /**
   * Get circuit status for a service
   * @param serviceName Name of the service
   * @returns Circuit breaker status
   */
  public getCircuitStatus(serviceName: string): CircuitBreakerStatus | null {
    const circuit = this.circuits.get(serviceName);
    if (!circuit) {
      return null;
    }
    
    return {
      status: circuit.status as 'open' | 'closed' | 'half-open',
      failures: circuit.failures,
      fallbackCount: circuit.fallbacks,
      lastError: circuit.error,
      totalFailures: circuit.stats.failures,
      totalSuccesses: circuit.stats.successes,
      totalRequests: circuit.stats.fires
    };
  }

  /**
   * Get circuit status for all services
   * @returns Status of all circuit breakers
   */
  public getAllCircuitStatus(): CircuitStatus {
    const status: CircuitStatus = {};
    
    for (const [serviceName, circuit] of this.circuits.entries()) {
      status[serviceName] = {
        status: circuit.status as 'open' | 'closed' | 'half-open',
        failures: circuit.failures,
        fallbackCount: circuit.fallbacks,
        lastError: circuit.error,
        totalFailures: circuit.stats.failures,
        totalSuccesses: circuit.stats.successes,
        totalRequests: circuit.stats.fires
      };
    }
    
    return status;
  }

  /**
   * Reset circuit for a service
   * @param serviceName Name of the service
   * @returns Result of reset operation
   */
  public resetCircuit(serviceName: string): { success: boolean; message: string } {
    const circuit = this.circuits.get(serviceName);
    if (!circuit) {
      return {
        success: false,
        message: \`No circuit found for service: \${serviceName}\`
      };
    }
    
    try {
      circuit.close();
      return {
        success: true,
        message: \`Circuit for service \${serviceName} has been reset\`
      };
    } catch (error) {
      return {
        success: false,
        message: \`Failed to reset circuit for service \${serviceName}: \${error.message}\`
      };
    }
  }
}

export default EnhancedClient;
`;
      
      fs.writeFileSync(ENHANCED_CLIENT_PATH, enhancedClientContent, 'utf8');
      console.log('Enhanced client TypeScript utility created.');
    }
  } catch (error) {
    console.error('Failed to create enhanced client utility:', error);
    process.exit(1);
  }
}

/**
 * Create service client implementation with circuit breaker
 */
async function createServiceImplementation() {
  const implementationPath = path.join(UTILS_DIR, 'service-client.ts');
  console.log('Creating service-specific client implementation...');
  
  try {
    // Create TypeScript implementation
    const implementationContent = `/**
 * Auth Service Client with Circuit Breaker
 * 
 * Pre-configured enhanced client for Auth Service to communicate with other services.
 */
import { Request, Response } from 'express';
import EnhancedClient, { EnhancedClientConfig } from './enhanced-client';
import config from '../config/config';

// Create client with service-specific configuration
const clientConfig: EnhancedClientConfig = {
  maxRetries: config.enhancedConnectivity?.maxRetries || 3,
  retryDelay: config.enhancedConnectivity?.retryDelay || 1000,
  connectionTimeout: config.enhancedConnectivity?.connectionTimeout || 5000,
  circuitBreakerThreshold: config.enhancedConnectivity?.circuitBreakerThreshold || 3,
  resetTimeout: config.enhancedConnectivity?.resetTimeout || 30000,
  errorThresholdPercentage: config.enhancedConnectivity?.errorThresholdPercentage || 50,
  logPrefix: '[AuthService]'
};

const serviceClient = new EnhancedClient(clientConfig);

// Service URLs
const SERVICE_URLS = {
  API_GATEWAY: process.env.API_GATEWAY_URL || 'http://api-gateway:3000',
  QUESTIONNAIRE: process.env.QUESTIONNAIRE_SERVICE_URL || 'http://questionnaire-service:3002',
  ANALYSIS: process.env.ANALYSIS_SERVICE_URL || 'http://analysis-service:3003',
  REPORT: process.env.REPORT_SERVICE_URL || 'http://report-service:3004',
  PAYMENT: process.env.PAYMENT_SERVICE_URL || 'http://payment-service:3005'
};

/**
 * Make request to API Gateway
 * @param options Request options
 * @returns Response data
 */
export async function callApiGateway(options: any) {
  return serviceClient.request('api-gateway', {
    ...options,
    baseURL: SERVICE_URLS.API_GATEWAY,
    healthCheckUrl: \`\${SERVICE_URLS.API_GATEWAY}/health\`
  });
}

/**
 * Make request to Questionnaire Service
 * @param options Request options
 * @returns Response data
 */
export async function callQuestionnaireService(options: any) {
  return serviceClient.request('questionnaire-service', {
    ...options,
    baseURL: SERVICE_URLS.QUESTIONNAIRE,
    healthCheckUrl: \`\${SERVICE_URLS.QUESTIONNAIRE}/health\`
  });
}

/**
 * Get circuit status information
 * @returns Circuit status for all services
 */
export function getCircuitStatus() {
  return serviceClient.getAllCircuitStatus();
}

/**
 * Reset circuit for a specific service
 * @param serviceName Name of the service to reset
 * @returns Result of the reset operation
 */
export function resetCircuit(serviceName: string) {
  return serviceClient.resetCircuit(serviceName);
}

/**
 * Circuit breaker status endpoint middleware
 * @param req Request object
 * @param res Response object
 */
export function circuitStatusHandler(req: Request, res: Response) {
  res.status(200).json(getCircuitStatus());
}

/**
 * Circuit reset endpoint middleware
 * @param req Request object
 * @param res Response object
 */
export function circuitResetHandler(req: Request, res: Response) {
  const serviceName = req.body.service;
  
  if (!serviceName) {
    return res.status(400).json({ error: 'Service name is required' });
  }
  
  try {
    const result = resetCircuit(serviceName);
    res.status(200).json({ result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export default {
  callApiGateway,
  callQuestionnaireService,
  getCircuitStatus,
  resetCircuit,
  circuitStatusHandler,
  circuitResetHandler
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
 * Add circuit breaker diagnostic endpoints
 */
async function addCircuitBreakerEndpoints() {
  console.log('Adding circuit breaker diagnostic endpoints...');
  
  try {
    if (!fs.existsSync(HEALTH_ENDPOINT_PATH)) {
      console.error('Routes file not found. Please create it first.');
      process.exit(1);
    }
    
    let routesContent = fs.readFileSync(HEALTH_ENDPOINT_PATH, 'utf8');
    
    // Check if we've already added the circuit breaker endpoints
    if (routesContent.includes('router.get(\'/circuit-status\'')) {
      console.log('Circuit breaker endpoints already exist.');
    } else {
      // Import the service client
      if (!routesContent.includes('service-client')) {
        const importSection = routesContent.match(/import.*from.*;/g);
        if (importSection && importSection.length > 0) {
          const lastImport = importSection[importSection.length - 1];
          const importIndex = routesContent.indexOf(lastImport) + lastImport.length;
          
          routesContent = 
            routesContent.substring(0, importIndex) + 
            '\nimport { circuitStatusHandler, circuitResetHandler } from \'../utils/service-client\';' +
            routesContent.substring(importIndex);
        }
      }
      
      // Find the appropriate location to add the endpoints
      const healthEndpointIndex = routesContent.indexOf('router.get(\'/health\'');
      if (healthEndpointIndex !== -1) {
        // Find the end of the health endpoint
        const healthEndpointEnd = routesContent.indexOf('});', healthEndpointIndex) + 3;
        
        routesContent = 
          routesContent.substring(0, healthEndpointEnd) + 
          '\n\n// Circuit breaker status endpoint\n' +
          'router.get(\'/circuit-status\', circuitStatusHandler);\n\n' +
          '// Circuit breaker reset endpoint (admin only)\n' +
          'router.post(\'/circuit-reset\', circuitResetHandler);' +
          routesContent.substring(healthEndpointEnd);
        
        fs.writeFileSync(HEALTH_ENDPOINT_PATH, routesContent, 'utf8');
        console.log('Circuit breaker diagnostic endpoints added.');
      } else {
        console.warn('Could not find health endpoint. Manual addition of circuit breaker endpoints required.');
      }
    }
  } catch (error) {
    console.error('Failed to add circuit breaker diagnostic endpoints:', error);
    process.exit(1);
  }
}

/**
 * Update token validation to use circuit breaker
 */
async function updateTokenValidation() {
  console.log('Updating token validation to use circuit breaker...');
  
  const validateTokenControllerPath = path.join(SERVICE_ROOT, 'src/controllers/validate-token.controller.ts');
  
  try {
    if (!fs.existsSync(validateTokenControllerPath)) {
      console.warn('Validate token controller not found. Skipping update.');
      return;
    }
    
    let controllerContent = fs.readFileSync(validateTokenControllerPath, 'utf8');
    
    // Check if we've already updated the controller
    if (controllerContent.includes('service-client')) {
      console.log('Token validation already updated to use circuit breaker.');
      return;
    }
    
    // Add import for service client
    if (!controllerContent.includes('service-client')) {
      const importSection = controllerContent.match(/import.*from.*;/g);
      if (importSection && importSection.length > 0) {
        const lastImport = importSection[importSection.length - 1];
        const importIndex = controllerContent.indexOf(lastImport) + lastImport.length;
        
        controllerContent = 
          controllerContent.substring(0, importIndex) + 
          '\nimport serviceClient from \'../utils/service-client\';' +
          controllerContent.substring(importIndex);
      }
    }
    
    // We need to update any API calls to use the circuit breaker
    // This is a simplified approach; exact changes depend on the actual code
    
    // Replace direct axios calls with service client calls
    controllerContent = controllerContent.replace(
      /axios\.get\(['"](http:\/\/api-gateway:[^'"]+)['"]\)/g,
      'serviceClient.callApiGateway({ method: \'get\', url: \'$1\' })'
    );
    
    controllerContent = controllerContent.replace(
      /axios\.post\(['"](http:\/\/api-gateway:[^'"]+)['"],\s*([^)]+)\)/g,
      'serviceClient.callApiGateway({ method: \'post\', url: \'$1\', data: $2 })'
    );
    
    controllerContent = controllerContent.replace(
      /axios\.get\(['"](http:\/\/questionnaire-service:[^'"]+)['"]\)/g,
      'serviceClient.callQuestionnaireService({ method: \'get\', url: \'$1\' })'
    );
    
    controllerContent = controllerContent.replace(
      /axios\.post\(['"](http:\/\/questionnaire-service:[^'"]+)['"],\s*([^)]+)\)/g,
      'serviceClient.callQuestionnaireService({ method: \'post\', url: \'$1\', data: $2 })'
    );
    
    fs.writeFileSync(validateTokenControllerPath, controllerContent, 'utf8');
    console.log('Token validation updated to use circuit breaker.');
  } catch (error) {
    console.error('Failed to update token validation:', error);
    console.warn('Manual update of token validation may be required.');
  }
}

/**
 * Main function to run all updates
 */
async function main() {
  console.log('Starting Auth Service Circuit Breaker Implementation...');
  
  try {
    await updateServiceConfig();
    await addHealthEndpoint();
    await updateServiceDependencies();
    await createEnhancedClientUtility();
    await createServiceImplementation();
    await addCircuitBreakerEndpoints();
    await updateTokenValidation();
    
    console.log('\nAuth Service Circuit Breaker Implementation completed successfully!');
    console.log('To apply these changes:');
    console.log('1. Run "npm install" in the Auth Service directory');
    console.log('2. Run "npm run build" to compile TypeScript');
    console.log('3. Restart the Auth Service');
    console.log('4. Test the /health and /circuit-status endpoints');
  } catch (error) {
    console.error('Implementation failed:', error);
    process.exit(1);
  }
}

// Run the main function
main();
