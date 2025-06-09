/**
 * Enhanced API Client with retry logic and circuit breaker pattern
 */
const axios = require('axios');
const axiosRetry = require('axios-retry');
const CircuitBreaker = require('opossum');
const config = require('../config/config');

// Initialize global circuit breaker state if not already done
if (!global.circuitBreakerState) {
  global.circuitBreakerState = {
    authCircuitOpen: false
  };
}

class EnhancedClient {
  constructor() {
    // Create base axios client
    this.axios = axios.create({
      timeout: config.enhancedConnectivity?.connectionTimeout || 10000 // Increased default from 5000 to 10000
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
      timeout: 30000, // Increased from 10000 to prevent token validation timeouts // Time in milliseconds to wait for the function to complete
      errorThresholdPercentage: 50, // When 50% of requests fail, trip the circuit
      resetTimeout: 30000 // Time in milliseconds to wait before trying the function again
    };
    
    this.breakers = {};
  }

  // Get or create circuit breaker for a given service
  getBreaker(serviceName, requestFn) {
    if (!serviceName) {
      console.warn('Warning: getBreaker called without serviceName, using "unknown-service"');
      serviceName = 'unknown-service';
    }
    if (!requestFn) {
      console.warn('Warning: getBreaker called without requestFn, using empty function');
      requestFn = async () => ({});
    }
    if (!this.breakers[serviceName]) {
      this.breakers[serviceName] = new CircuitBreaker(requestFn, this.circuitOptions);
      
      // Add listeners
      this.breakers[serviceName].on('open', () => {
        console.warn(`Circuit breaker for ${serviceName} opened - service appears to be having issues`);
      });
      
      this.breakers[serviceName].on('close', () => {
        console.log(`Circuit breaker for ${serviceName} closed - service has recovered`);
      });
      
      this.breakers[serviceName].on('halfOpen', () => {
        console.log(`Circuit breaker for ${serviceName} is half-open - testing if service has recovered`);
      });
    }
    
    return this.breakers[serviceName];
  }

  // Make request with circuit breaker pattern
  async request(serviceName, options) {
    if (!serviceName) {
      console.warn('Warning: request called without serviceName, using "unknown-service"');
      serviceName = 'unknown-service';
    }
    if (!options) {
      console.warn('Warning: request called without options, using empty object');
      options = {};
    }
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

  // Check if auth circuit is open
  async isAuthCircuitOpen() {
    try {
    return global?.circuitBreakerState?.authCircuitOpen || false;
    } catch (error) {
      console.error('Error checking circuit breaker state:', error);
      return false;
    }
  }

  // Check health of a service
  async checkHealth(serviceUrl) {
    if (!serviceUrl) {
      console.warn('Warning: checkHealth called without serviceUrl');
      return false;
    }
    try {
      const response = await this.axios.get(`${serviceUrl}/health`);
      return response.data.status === 'ok';
    } catch (error) {
      return false;
    }
  }
}

// Export singleton instance
module.exports = new EnhancedClient();
