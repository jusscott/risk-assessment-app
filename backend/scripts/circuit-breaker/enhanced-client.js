/**
 * Enhanced API Client with Circuit Breaker Pattern
 * 
 * A reusable circuit breaker implementation for microservice communication.
 * This utility provides:
 * 
 * 1. Circuit Breaker Pattern - Prevents cascading failures when services are down
 * 2. Retry Logic - Automatically retries failed requests with exponential backoff
 * 3. Health Check Integration - Monitors service health for circuit decisions
 * 4. Connection Pooling - Optimizes connection handling
 * 5. Timeout Management - Configurable timeouts for different operations
 */

const axios = require('axios');
const CircuitBreaker = require('opossum');

class EnhancedClient {
  constructor(options = {}) {
    // Default configuration
    this.config = {
      maxRetries: options.maxRetries || 3,
      retryDelay: options.retryDelay || 1000,
      connectionTimeout: options.connectionTimeout || 5000,
      circuitBreakerThreshold: options.circuitBreakerThreshold || 3,
      resetTimeout: options.resetTimeout || 30000,
      errorThresholdPercentage: options.errorThresholdPercentage || 50,
      enableLogging: options.enableLogging !== false,
      logPrefix: options.logPrefix || '[EnhancedClient]',
      ...options
    };
    
    // Create axios instance with enhanced settings
    this.axios = axios.create({
      timeout: this.config.connectionTimeout,
      headers: { 'Connection': 'keep-alive' }
    });
    
    // Add request interceptor for customizing requests
    this.axios.interceptors.request.use(
      (config) => {
        // You can modify request config here (add headers, etc.)
        return config;
      },
      (error) => {
        this.log('error', `Request error: ${error.message}`);
        return Promise.reject(error);
      }
    );
    
    // Initialize circuit breakers
    this.circuitBreakers = new Map();
    
    // Initialize failure counters
    this.failureCounters = new Map();
    
    // Initialize circuit states
    this.circuitOpen = new Map();
    
    // Initialize last health checks
    this.lastHealthChecks = new Map();
  }
  
  /**
   * Log a message with the specified level
   * @param {string} level - Log level (info, warn, error, debug)
   * @param {string} message - Message to log
   */
  log(level, message) {
    if (!this.config.enableLogging) return;
    
    const prefix = this.config.logPrefix;
    
    switch (level) {
      case 'info':
        console.info(`${prefix} ${message}`);
        break;
      case 'warn':
        console.warn(`${prefix} ${message}`);
        break;
      case 'error':
        console.error(`${prefix} ${message}`);
        break;
      case 'debug':
        console.debug(`${prefix} ${message}`);
        break;
      default:
        console.log(`${prefix} ${message}`);
    }
  }
  
  /**
   * Get or create a circuit breaker for a service
   * @param {string} serviceName - Name of the service
   * @param {Function} requestFn - Function to execute within the circuit
   * @returns {CircuitBreaker} The circuit breaker instance
   */
  getCircuitBreaker(serviceName, requestFn) {
    if (this.circuitBreakers.has(serviceName)) {
      return this.circuitBreakers.get(serviceName);
    }
    
    // Create circuit breaker options
    const options = {
      timeout: this.config.connectionTimeout * 2, // Double the connection timeout
      errorThresholdPercentage: this.config.errorThresholdPercentage,
      resetTimeout: this.config.resetTimeout,
      rollingCountTimeout: 60000, // Use 60s window for metrics
      rollingCountBuckets: 10 // Split window into 10 buckets
    };
    
    // Create circuit breaker
    const breaker = new CircuitBreaker(requestFn, options);
    
    // Add listeners
    breaker.on('open', () => {
      this.log('warn', `Circuit for ${serviceName} opened - service appears to be having issues`);
      this.circuitOpen.set(serviceName, true);
    });
    
    breaker.on('close', () => {
      this.log('info', `Circuit for ${serviceName} closed - service has recovered`);
      this.circuitOpen.set(serviceName, false);
      this.failureCounters.set(serviceName, 0);
    });
    
    breaker.on('halfOpen', () => {
      this.log('info', `Circuit for ${serviceName} is half-open - testing if service has recovered`);
    });
    
    breaker.on('fallback', (result) => {
      this.log('warn', `Circuit for ${serviceName} using fallback`);
    });
    
    breaker.on('reject', () => {
      this.log('warn', `Circuit for ${serviceName} rejected the request`);
    });
    
    // Store the circuit breaker
    this.circuitBreakers.set(serviceName, breaker);
    
    // Initialize failure counter
    this.failureCounters.set(serviceName, 0);
    
    // Initialize circuit state
    this.circuitOpen.set(serviceName, false);
    
    // Initialize last health check
    this.lastHealthChecks.set(serviceName, Date.now());
    
    return breaker;
  }
  
  /**
   * Make a request to a service with circuit breaker protection
   * @param {string} serviceName - Name of the service to call
   * @param {Object} options - Request options (same as axios)
   * @param {Object} circuitOptions - Circuit breaker options
   * @returns {Promise<Object>} The response
   */
  async request(serviceName, options, circuitOptions = {}) {
    // Check if circuit is open (failing)
    if (this.circuitOpen.get(serviceName)) {
      const timeSinceLastCheck = Date.now() - this.lastHealthChecks.get(serviceName);
      
      // Try to reset circuit after reset timeout
      if (timeSinceLastCheck > this.config.resetTimeout) {
        this.log('info', `Attempting to reset circuit for ${serviceName}...`);
        await this.checkHealth(serviceName, options.healthCheckUrl);
      } else {
        throw new Error(`Circuit open for ${serviceName} - service appears to be down`);
      }
    }
    
    // Create function to execute
    const requestFn = async () => {
      try {
        const response = await this.axios(options);
        
        // Reset failure counter on success
        this.failureCounters.set(serviceName, 0);
        
        return response;
      } catch (error) {
        // Increment failure counter
        const failureCount = (this.failureCounters.get(serviceName) || 0) + 1;
        this.failureCounters.set(serviceName, failureCount);
        
        // Check if circuit breaker threshold reached
        if (failureCount >= this.config.circuitBreakerThreshold) {
          this.circuitOpen.set(serviceName, true);
          this.log('error', `Circuit breaker triggered for ${serviceName} after ${this.config.circuitBreakerThreshold} failures`);
        }
        
        // Enhance error with service information
        error.serviceName = serviceName;
        throw error;
      }
    };
    
    // Get circuit breaker
    const breaker = this.getCircuitBreaker(serviceName, requestFn);
    
    // Add fallback if provided
    if (circuitOptions.fallback) {
      breaker.fallback(circuitOptions.fallback);
    }
    
    // Execute with circuit breaker
    let lastError;
    
    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      try {
        // Fire the circuit breaker
        return await breaker.fire();
      } catch (error) {
        lastError = error;
        this.log('warn', `Request to ${serviceName} failed (attempt ${attempt + 1}/${this.config.maxRetries}): ${error.message}`);
        
        // Exit early if circuit is open
        if (this.circuitOpen.get(serviceName)) {
          break;
        }
        
        // Wait before retry with exponential backoff
        if (attempt < this.config.maxRetries - 1) {
          const delay = this.config.retryDelay * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // If we get here, all retries failed
    throw lastError || new Error(`Failed to communicate with ${serviceName} after ${this.config.maxRetries} attempts`);
  }
  
  /**
   * Check the health of a service
   * @param {string} serviceName - Name of the service
   * @param {string} healthCheckUrl - URL to check (defaults to /health)
   * @returns {Promise<boolean>} True if service is healthy
   */
  async checkHealth(serviceName, healthCheckUrl) {
    this.lastHealthChecks.set(serviceName, Date.now());
    
    try {
      // Try to connect to the service's health endpoint
      await this.axios({
        method: 'get',
        url: healthCheckUrl || '/health',
        timeout: 2000 // Shorter timeout for health checks
      });
      
      // If successful, reset circuit
      this.circuitOpen.set(serviceName, false);
      this.failureCounters.set(serviceName, 0);
      this.log('info', `${serviceName} is healthy, circuit closed`);
      return true;
    } catch (error) {
      this.log('error', `Health check failed for ${serviceName}: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Get HTTP methods as convenience functions
   */
  async get(serviceName, url, config = {}, circuitOptions = {}) {
    return this.request(serviceName, { 
      method: 'get', 
      url, 
      ...config 
    }, circuitOptions);
  }
  
  async post(serviceName, url, data, config = {}, circuitOptions = {}) {
    return this.request(serviceName, { 
      method: 'post', 
      url, 
      data, 
      ...config 
    }, circuitOptions);
  }
  
  async put(serviceName, url, data, config = {}, circuitOptions = {}) {
    return this.request(serviceName, { 
      method: 'put', 
      url, 
      data, 
      ...config 
    }, circuitOptions);
  }
  
  async delete(serviceName, url, config = {}, circuitOptions = {}) {
    return this.request(serviceName, { 
      method: 'delete', 
      url, 
      ...config 
    }, circuitOptions);
  }
  
  /**
   * Get the status of a circuit
   * @param {string} serviceName - Name of the service
   * @returns {Object} Circuit status
   */
  getCircuitStatus(serviceName) {
    const breaker = this.circuitBreakers.get(serviceName);
    
    if (!breaker) {
      return {
        serviceName,
        exists: false
      };
    }
    
    return {
      serviceName,
      exists: true,
      state: breaker.status.state,
      stats: {
        failures: this.failureCounters.get(serviceName) || 0,
        lastCheck: this.lastHealthChecks.get(serviceName) || null,
        isOpen: this.circuitOpen.get(serviceName) || false,
        metrics: {
          successes: breaker.stats.successes,
          failures: breaker.stats.failures,
          rejects: breaker.stats.rejects,
          timeouts: breaker.stats.timeouts
        }
      }
    };
  }
  
  /**
   * Get status of all circuits
   * @returns {Object} Status information for all circuits
   */
  getAllCircuitStatus() {
    const result = {
      circuits: {},
      totalCircuits: this.circuitBreakers.size,
      openCircuits: Array.from(this.circuitOpen.values()).filter(Boolean).length
    };
    
    // Add individual circuit info
    for (const serviceName of this.circuitBreakers.keys()) {
      result.circuits[serviceName] = this.getCircuitStatus(serviceName);
    }
    
    return result;
  }
}

module.exports = EnhancedClient;
