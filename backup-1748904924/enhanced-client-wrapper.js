/**
 * Enhanced client wrapper for auth service communication
 * 
 * This wrapper adds event emission capabilities to the standard circuit breaker
 * to allow the questionnaire service to react to auth service availability changes.
 */

// Fix path to ensure it can find the module in both development and Docker environments
const path = require('path');
const fs = require('fs');

// Try to find the enhanced client module in multiple possible locations
let EnhancedClient;
const possiblePaths = [
  path.resolve(__dirname, './enhanced-client.js'),
  path.resolve(__dirname, '../utils/enhanced-client.js'),
  path.resolve(__dirname, './enhanced-client.js'),
  path.resolve(__dirname, '../utils/enhanced-client.js'),
  path.resolve(__dirname, '../../../scripts/circuit-breaker/enhanced-client.js'),
  path.resolve(__dirname, '../../../backend/scripts/circuit-breaker/enhanced-client.js'),
  path.resolve(__dirname, '../../../../scripts/circuit-breaker/enhanced-client.js')
];

for (const possiblePath of possiblePaths) {
  try {
    if (fs.existsSync(possiblePath)) {
      EnhancedClient = require(possiblePath);
      console.log(`Found EnhancedClient at: ${possiblePath}`);
      break;
    }
  } catch (err) {
    console.log(`Path ${possiblePath} not accessible: ${err.message}`);
  }
}

// Fallback implementation if module cannot be found
if (!EnhancedClient) {
  console.warn('Could not find EnhancedClient module, using fallback implementation');
  
  // Simple fallback implementation of EnhancedClient
  EnhancedClient = class EnhancedClientFallback {
    constructor(options = {}) {
      this.options = options;
      console.log('Using fallback EnhancedClient implementation');
    }
    
    getCircuitBreaker(serviceName, requestFn) {
      // Simple event emitter that mimics the circuit breaker interface
      const emitter = new (require('events').EventEmitter)();
      
      // Add fire method to simulate the real circuit breaker
      emitter.fire = async function(...args) {
        try {
          return await requestFn(...args);
        } catch (error) {
          return Promise.reject(error);
        }
      };
      
      return emitter;
    }
  };
}
const EventEmitter = require('events');

// Create global event emitter and state objects if they don't exist
if (!global.processEventEmitter) {
  global.processEventEmitter = new EventEmitter();
  process.eventEmitter = global.processEventEmitter;
  // Global shared circuit breaker state
  global.circuitBreakerState = {
    authCircuitOpen: false
  };
}

// Extend the enhanced client with event emission capabilities
class EventAwareEnhancedClient extends EnhancedClient {
  constructor(options = {}) {
    super(options);
    
    // Track the auth service status
    this.authServiceStatus = 'unknown';
    
    // Register event emitter if available
    this.eventEmitter = process.eventEmitter;
  }
  
  // Override the getCircuitBreaker method to add event emission
  getCircuitBreaker(serviceName, requestFn) {
    const breaker = super.getCircuitBreaker(serviceName, requestFn);
    
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
    return global.circuitBreakerState.authCircuitOpen;
  }
  
  // Helper to set auth circuit state
  setAuthCircuitOpen(isOpen) {
    global.circuitBreakerState.authCircuitOpen = isOpen;
  }
}

// Create and export a singleton instance for the auth service with safer initialization
let authServiceClient;
try {
  try {
  try {
  authServiceClient = new EventAwareEnhancedClient({
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
} catch (error) {
  console.error('Failed to initialize auth service client:', error);
  // Create a minimal fallback client that won't break the app
  authServiceClient = {
    isAuthCircuitOpen: () => false,
    getAuthServiceStatus: () => 'unknown'
  };
}
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
  EventAwareEnhancedClient
};
