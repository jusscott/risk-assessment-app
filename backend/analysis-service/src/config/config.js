/**
 * Configuration settings for the analysis service
 */

require('dotenv').config();

const config = {
  // Server configuration
  port: process.env.PORT || 5004,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database configuration
  database: {
    url: process.env.DATABASE_URL
  },
  
  // JWT configuration for authentication
  jwt: {
    secret: process.env.JWT_SECRET || 'analysis-service-development-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '1d'
  },
  
  // API configuration
  api: {
    prefix: '/api'
  },
  
  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info'
  },
  
  // Service URLs for inter-service communication
  services: {
    questionnaire: process.env.QUESTIONNAIRE_SERVICE_URL || 'http://questionnaire-service:5002',
    auth: process.env.AUTH_SERVICE_URL || 'http://auth-service:5001/api',
    report: process.env.REPORT_SERVICE_URL || 'http://report-service:5005',
    reportService: {
      host: process.env.REPORT_SERVICE_HOST || 'report-service',
      port: process.env.REPORT_SERVICE_PORT || '5005',
      wsUrl: process.env.REPORT_SERVICE_WS_URL || 'ws://report-service:5005/ws',
      httpUrl: process.env.REPORT_SERVICE_URL || 'http://report-service:5005'
    }
  },
  
  // Analysis configuration
  analysis: {
    // Risk score thresholds
    riskThresholds: {
      low: 3.0,
      medium: 6.0,
      high: 8.0
    },
    
    // Default weights for different security categories
    categoryWeights: {
      'Access Control': 0.20,
      'Data Protection': 0.20,
      'Network Security': 0.15,
      'Application Security': 0.15,
      'Security Awareness': 0.10,
      'Incident Response': 0.10,
      'Physical Security': 0.05,
      'Compliance': 0.05
    }
  },
  
  // Connection and timeout configuration
  connection: {
    // HTTP request timeout in milliseconds
    httpTimeout: process.env.HTTP_TIMEOUT || 30000,
    
    // Task execution timeout in milliseconds
    taskTimeout: process.env.TASK_TIMEOUT || 120000,
    
    // Maximum number of concurrent tasks
    concurrencyLimit: process.env.CONCURRENCY_LIMIT || 3,
    
    // Maximum number of retry attempts
    retryLimit: process.env.RETRY_LIMIT || 3,
    
    // Circuit breaker failure threshold
    circuitBreakerThreshold: process.env.CIRCUIT_BREAKER_THRESHOLD || 5,
    
    // Circuit breaker reset timeout in milliseconds
    circuitBreakerResetTimeout: process.env.CIRCUIT_BREAKER_RESET_TIMEOUT || 30000
  },
  
  // WebSocket connection configuration
  sockets: {
    // Enable debug logging for socket connections
    debugSocket: process.env.DEBUG_SOCKET === 'true' || false,
    
    // Keep-alive interval in milliseconds
    keepAliveInterval: parseInt(process.env.WS_KEEP_ALIVE_INTERVAL || '30000', 10),
    
    // Reconnect interval in milliseconds
    reconnectInterval: parseInt(process.env.WS_RECONNECT_INTERVAL || '5000', 10),
    
    // Ping timeout in milliseconds
    pingTimeout: parseInt(process.env.WS_PING_TIMEOUT || '5000', 10),
    
    // Maximum reconnect delay in milliseconds
    maxReconnectDelay: parseInt(process.env.WS_MAX_RECONNECT_DELAY || '60000', 10),
    
    // Buffer threshold before throttling
    bufferThreshold: parseInt(process.env.WS_BUFFER_THRESHOLD || '100', 10),
    
    // High priority buffer size
    highPriorityBufferSize: parseInt(process.env.WS_HIGH_PRIORITY_BUFFER_SIZE || '50', 10)
  }
};

module.exports = config;
