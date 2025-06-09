/**
 * Integration Test Configuration
 * Centralized configuration for all integration tests
 */

module.exports = {
  /**
   * Service endpoints
   * These URLs are used by the tests to connect to the different services
   */
  services: {
    // Main API Gateway that all tests should go through
    apiGateway: process.env.API_GATEWAY_URL || 'http://localhost:5000',
    
    // Individual service URLs for direct testing (mostly used for health checks)
    auth: process.env.AUTH_SERVICE_URL || 'http://localhost:5001',
    questionnaire: process.env.QUESTIONNAIRE_SERVICE_URL || 'http://localhost:5002',
    payment: process.env.PAYMENT_SERVICE_URL || 'http://localhost:5003',
    analysis: process.env.ANALYSIS_SERVICE_URL || 'http://localhost:5004',
    report: process.env.REPORT_SERVICE_URL || 'http://localhost:5005'
  },
  
  /**
   * Test user accounts
   * These are used for authentication and authorization tests
   */
  testUsers: {
    // Regular user with basic permissions
    regularUser: {
      email: process.env.TEST_USER_EMAIL || 'test-user@example.com',
      password: process.env.TEST_USER_PASSWORD || 'Test12345!',
      firstName: 'Test',
      lastName: 'User',
      organizationName: 'Test Organization Inc.'
    },
    
    // Admin user with all permissions
    adminUser: {
      email: process.env.TEST_ADMIN_EMAIL || 'test-admin@example.com',
      password: process.env.TEST_ADMIN_PASSWORD || 'Admin12345!',
      firstName: 'Test',
      lastName: 'Admin',
      organizationName: 'Admin Test Org' // Added organizationName for consistency
    }
  },
  
  /**
   * Test data settings
   * Configures test data generation and management
   */
  testData: {
    // Whether to clean up test data after tests run
    cleanup: process.env.CLEANUP_TEST_DATA !== 'false',
    
    // Template for generating unique test data
    uniquePrefix: `test-${new Date().toISOString().replace(/:/g, '-')}`
  },
  
  /**
   * Timeouts and timing settings (in milliseconds)
   */
  timeouts: {
    // Default request timeout
    request: 5000,
    
    // Timeout for long-running operations
    longOperation: 30000,
    
    // Timeout for very long operations (like report generation)
    veryLongOperation: 60000
  },
  
  /**
   * Retry settings
   * Configure how tests handle retries for flaky operations
   */
  retry: {
    // Maximum number of retries
    maxRetries: 3,
    
    // Delay between retries (in milliseconds)
    retryDelay: 1000,
    
    // Whether to use exponential backoff
    useExponentialBackoff: true
  },
  
  /**
   * Reporting settings
   * Configure test reporting behavior
   */
  reporting: {
    // Whether to save detailed reports
    saveDetailedReports: true,
    
    // Whether to capture HTTP request/response data
    captureHttpData: true,
    
    // Maximum response size to capture (to avoid huge files)
    maxResponseSize: 10000
  },
  
  /**
   * Environment settings
   * Configuration related to the test environment
   */
  environment: {
    // Whether running in CI environment
    isCI: process.env.CI === 'true',
    
    // Whether to stop services after tests
    cleanupServices: process.env.CLEANUP_SERVICES === 'true'
  },
  
  /**
   * Time to wait for services to start (in milliseconds)
   * Used when automatically starting services
   */
  serviceStartupTime: 60000, // Increased to 60 seconds to allow for full database initialization
  
  /**
   * Test-specific configuration
   * Settings for specific test scenarios
   */
  tests: {
    // Payment service test settings
    payment: {
      // Test card for successful payments
      testCard: {
        number: '4242424242424242',
        expMonth: 12,
        expYear: 2030,
        cvc: '123'
      },
      
      // Test card for failed payments
      failCard: {
        number: '4000000000000002',
        expMonth: 12,
        expYear: 2030,
        cvc: '123'
      }
    },
    
    // Analysis service test settings
    analysis: {
      // Maximum time to wait for analysis completion (in milliseconds)
      maxAnalysisTime: 30000
    },
    
    // Report service test settings
    report: {
      // Maximum time to wait for report generation (in milliseconds)
      maxReportTime: 45000
    }
  }
};
