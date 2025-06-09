// Configuration based on environment
// Log key environment variables for debugging
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('AUTH_SERVICE_URL:', process.env.AUTH_SERVICE_URL);
console.log('ALLOWED_ORIGINS:', process.env.ALLOWED_ORIGINS);
console.log('BYPASS_AUTH:', process.env.BYPASS_AUTH);

const config = {
  development: {
    // Enhanced connectivity settings
    enhancedConnectivity: {
      enabled: true,
      maxRetries: 5,
      retryDelay: 1000,
      connectionTimeout: 5000,
      keepAliveTimeout: 60000,
      circuitBreakerThreshold: 10,
    },
    port: process.env.PORT || 5002,
    jwt: {
      secret: process.env.JWT_SECRET || 'shared-security-risk-assessment-secret-key',
      accessExpiresIn: '1h',
    },
    allowedOrigins: process.env.ALLOWED_ORIGINS ? 
      process.env.ALLOWED_ORIGINS.split(',') : 
      ['http://localhost:3000', 'http://127.0.0.1:3000'],
    authService: {
      url: process.env.AUTH_SERVICE_URL || 'http://auth-service:5001/api',
    },
    analysisService: {
      url: process.env.ANALYSIS_SERVICE_URL || 'http://analysis-service:5004/api',
    },
    bypassAuth: process.env.BYPASS_AUTH === 'true',
  },
  test: {
    // Enhanced connectivity settings
    enhancedConnectivity: {
      enabled: true,
      maxRetries: 5,
      retryDelay: 1000,
      connectionTimeout: 5000,
      keepAliveTimeout: 60000,
      circuitBreakerThreshold: 10,
    },
    port: process.env.PORT || 5002,
    jwt: {
      secret: process.env.JWT_SECRET || 'shared-security-risk-assessment-secret-key',
      accessExpiresIn: '1h',
    },
    allowedOrigins: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    authService: {
      url: process.env.AUTH_SERVICE_URL || 'http://auth-service:5001/api',
    },
    analysisService: {
      url: process.env.ANALYSIS_SERVICE_URL || 'http://analysis-service:5004/api',
    },
    bypassAuth: process.env.BYPASS_AUTH === 'true',
  },
  production: {
    // Enhanced connectivity settings
    enhancedConnectivity: {
      enabled: true,
      maxRetries: 5,
      retryDelay: 1000,
      connectionTimeout: 5000,
      keepAliveTimeout: 60000,
      circuitBreakerThreshold: 10,
    },
    port: process.env.PORT || 5002,
    jwt: {
      secret: process.env.JWT_SECRET,
      accessExpiresIn: '15m',
    },
    allowedOrigins: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',')
      : ['https://app.riskscore.com'],
    authService: {
      url: process.env.AUTH_SERVICE_URL,
    },
    analysisService: {
      url: process.env.ANALYSIS_SERVICE_URL,
    },
  },
};

// Determine environment
const env = process.env.NODE_ENV || 'development';

module.exports = config[env];
