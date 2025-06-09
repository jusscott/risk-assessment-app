/**
 * Enhanced client wrapper for auth service communication
 * 
 * This wrapper adds event emission capabilities to the standard circuit breaker
 * to allow the questionnaire service to react to auth service availability changes.
 */

// Fix path to ensure it can find the module in both development and Docker environments
const path = require('path');
const fs = require('fs');
const EventEmitter = require('events');

// Try to find the enhanced client module in multiple possible locations
let enhancedClientModule;
const possiblePaths = [
  path.resolve(__dirname, './enhanced-client.js'),
  path.resolve(__dirname, '../utils/enhanced-client.js'),
  path.resolve(__dirname, '../../../scripts/circuit-breaker/enhanced-client.js'),
  path.resolve(__dirname, '../../../backend/scripts/circuit-breaker/enhanced-client.js'),
  path.resolve(__dirname, '../../../../scripts/circuit-breaker/enhanced-client.js')
];

// Search for the module
for (const possiblePath of possiblePaths) {
  try {
    if (fs.existsSync(possiblePath)) {
      enhancedClientModule = require(possiblePath);
      console.log(`Found EnhancedClient at: ${possiblePath}`);
      break;
    }
  } catch (err) {
    console.log(`Path ${possiblePath} not accessible: ${err.message}`);
  }
}

// Create global event emitter and state objects if they don't exist
if (!global.processEventEmitter) {
  global.processEventEmitter = new EventEmitter();
  process.eventEmitter = global.processEventEmitter;
  // Global shared circuit breaker state
  global.circuitBreakerState = {
    authCircuitOpen: false
  };
}

// Event-aware client that adapts the enhanced client functionality
class EventAwareClient {
  constructor(options = {}) {
    this.options = options;
    
    // If we have a module, use it; otherwise create fallback functionality
    this.baseClient = enhancedClientModule ? enhancedClientModule.default : {
      request: async () => { throw new Error("Base client not available"); },
      getCircuitBreaker: () => {
        const emitter = new EventEmitter();
        emitter.fire = async (...args) => { throw new Error("Circuit breaker not available"); };
        return emitter;
      }
    };
    
    // Track the auth service status
    this.authServiceStatus = 'unknown';
    
    // Register event emitter if available
    this.eventEmitter = process.eventEmitter;
  }
  
  // Get a circuit breaker that emits events for status changes
  getCircuitBreaker(serviceName, requestFn) {
    // Get the circuit breaker from the base client
    const breaker = this.baseClient.getCircuitBreaker 
      ? this.baseClient.getCircuitBreaker(serviceName, requestFn) 
      : new EventEmitter();

    if (serviceName === 'auth-service' && this.eventEmitter) {
      // Add event emission for auth service specifically
      breaker.on('open', () => {
        if (this.authServiceStatus !== 'open') {
          console.log('🔴 Auth service circuit breaker OPENED - emitting event');
          this.authServiceStatus = 'open';
          // Update global circuit state
          global.circuitBreakerState.authCircuitOpen = true;
          this.eventEmitter.emit('circuit-open', { service: 'auth-service' });
          process.env.CIRCUIT_BREAKER_FALLBACK_ENABLED = 'true';
        }
      });
      
      breaker.on('close', () => {
        if (this.authServiceStatus !== 'closed') {
          console.log('🟢 Auth service circuit breaker CLOSED - emitting event');
          this.authServiceStatus = 'closed';
          // Update global circuit state
          global.circuitBreakerState.authCircuitOpen = false;
          this.eventEmitter.emit('circuit-close', { service: 'auth-service' });
          process.env.CIRCUIT_BREAKER_FALLBACK_ENABLED = 'false';
        }
      });
      
      breaker.on('halfOpen', () => {
        console.log('🟡 Auth service circuit breaker HALF-OPEN - testing recovery');
      });
    }
    
    return breaker;
  }
  
  // Helper to check if auth circuit is open
  isAuthCircuitOpen() {
    if (!global.circuitBreakerState) {
      global.circuitBreakerState = {
        authCircuitOpen: false
      };
    }
    return global.circuitBreakerState.authCircuitOpen;
  }
  
  // Helper to set auth circuit state
  setAuthCircuitOpen(isOpen) {
    if (!global.circuitBreakerState) {
      global.circuitBreakerState = {
        authCircuitOpen: false
      };
    }
    global.circuitBreakerState.authCircuitOpen = isOpen;
  }

  // Proxy the request method
  request(serviceName, options) {
    if (this.baseClient.request) {
      return this.baseClient.request(serviceName, options);
    }
    return Promise.reject(new Error("Request method not available"));
  }

  // Proxy the checkHealth method
  async checkHealth(serviceUrl) {
    if (this.baseClient.checkHealth) {
      return this.baseClient.checkHealth(serviceUrl);
    }
    return false;
  }
}

// Create and export a singleton instance for the auth service with safer initialization
let authServiceClient;
try {
  authServiceClient = new EventAwareClient({
    maxRetries: 2,
    retryDelay: 1000,
    connectionTimeout: 3000,
    circuitBreakerThreshold: 3,
    resetTimeout: 30000,
    enableLogging: true,
    logPrefix: '[AuthServiceClient]'
  });
  console.log('Successfully initialized auth service client');
} catch (error) {
  console.error('Failed to initialize auth service client:', error);
  // Create a minimal fallback client that won't break the app
  authServiceClient = {
    isAuthCircuitOpen: () => false,
    getAuthServiceStatus: () => 'unknown'
  };
}

module.exports = {
  authServiceClient,
  EventAwareClient
};
