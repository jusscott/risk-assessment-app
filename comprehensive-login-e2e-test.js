#!/usr/bin/env node

/**
 * Comprehensive End-to-End Authentication Test Suite
 * 
 * This test validates the complete login flow including:
 * - User authentication
 * - Dashboard loading
 * - Protected route access
 * - Session management
 * - Error handling
 * 
 * Run this test regularly to catch authentication regressions early.
 */

const axios = require('axios');

class AuthTestSuite {
  constructor() {
    this.baseURL = 'http://localhost:5000';
    this.authServiceURL = 'http://localhost:5001';
    this.testUsers = [
      { email: 'good@test.com', password: 'Password123', name: 'Good Test User' },
      { email: 'jusscott@gmail.com', password: 'Password123', name: 'Justin Scott' }
    ];
    this.testResults = {
      passed: 0,
      failed: 0,
      total: 0,
      details: []
    };
  }

  // Helper method to record test results
  recordTest(testName, passed, message, details = null) {
    this.testResults.total++;
    if (passed) {
      this.testResults.passed++;
      console.log(`✅ ${testName}: ${message}`);
    } else {
      this.testResults.failed++;
      console.log(`❌ ${testName}: ${message}`);
      if (details) {
        console.log(`   Details: ${JSON.stringify(details, null, 2)}`);
      }
    }
    
    this.testResults.details.push({
      test: testName,
      passed,
      message,
      details
    });
  }

  // Test 1: Basic Authentication Service Health
  async testAuthServiceHealth() {
    const testName = 'Auth Service Health Check';
    try {
      const response = await axios.get(`${this.authServiceURL}/health`, { timeout: 5000 });
      const isHealthy = response.status === 200 && response.data.success;
      this.recordTest(testName, isHealthy, 
        isHealthy ? 'Auth service is healthy' : 'Auth service unhealthy',
        response.data
      );
      return isHealthy;
    } catch (error) {
      this.recordTest(testName, false, `Auth service unreachable: ${error.message}`);
      return false;
    }
  }

  // Test 2: API Gateway Health
  async testAPIGatewayHealth() {
    const testName = 'API Gateway Health Check';
    try {
      const response = await axios.get(`${this.baseURL}/health`, { timeout: 5000 });
      const isHealthy = response.status === 200 && response.data.success;
      this.recordTest(testName, isHealthy,
        isHealthy ? 'API Gateway is healthy' : 'API Gateway unhealthy',
        response.data
      );
      return isHealthy;
    } catch (error) {
      this.recordTest(testName, false, `API Gateway unreachable: ${error.message}`);
      return false;
    }
  }

  // Test 3: User Authentication Flow
  async testUserAuthentication(user) {
    const testName = `User Authentication - ${user.email}`;
    try {
      const response = await axios.post(`${this.baseURL}/api/auth/login`, {
        email: user.email,
        password: user.password
      }, {
        timeout: 10000,
        validateStatus: (status) => status < 500
      });

      const isSuccess = response.status === 200 && response.data.success && response.data.data?.tokens?.accessToken;
      
      if (isSuccess) {
        // Store token for subsequent tests
        user.token = response.data.data.tokens.accessToken;
        user.userData = response.data.data.user;
        this.recordTest(testName, true, `Authentication successful for ${user.email}`);
        return user;
      } else {
        this.recordTest(testName, false, 
          `Authentication failed: ${response.data.error?.message || 'Unknown error'}`,
          { status: response.status, data: response.data }
        );
        return null;
      }
    } catch (error) {
      this.recordTest(testName, false, `Authentication error: ${error.message}`);
      return null;
    }
  }

  // Test 4: Token Validation
  async testTokenValidation(user) {
    if (!user || !user.token) {
      this.recordTest(`Token Validation - ${user?.email || 'Unknown'}`, false, 'No token available');
      return false;
    }

    const testName = `Token Validation - ${user.email}`;
    try {
      const response = await axios.post(`${this.authServiceURL}/validate-token`, {}, {
        headers: {
          'Authorization': `Bearer ${user.token}`
        },
        timeout: 5000,
        validateStatus: (status) => status < 500
      });

      const isValid = response.status === 200 && response.data.success;
      this.recordTest(testName, isValid,
        isValid ? 'Token validation successful' : 'Token validation failed',
        response.data
      );
      return isValid;
    } catch (error) {
      this.recordTest(testName, false, `Token validation error: ${error.message}`);
      return false;
    }
  }

  // Test 5: Protected Route Access (Profile)
  async testProtectedRouteAccess(user) {
    if (!user || !user.token) {
      this.recordTest(`Protected Route Access - ${user?.email || 'Unknown'}`, false, 'No token available');
      return false;
    }

    const testName = `Protected Route Access - ${user.email}`;
    try {
      const response = await axios.get(`${this.authServiceURL}/profile`, {
        headers: {
          'Authorization': `Bearer ${user.token}`
        },
        timeout: 5000,
        validateStatus: (status) => status < 500
      });

      const hasAccess = response.status === 200 && response.data.success;
      this.recordTest(testName, hasAccess,
        hasAccess ? 'Protected route access successful' : 'Protected route access denied',
        response.data
      );
      return hasAccess;
    } catch (error) {
      this.recordTest(testName, false, `Protected route access error: ${error.message}`);
      return false;
    }
  }

  // Test 6: Dashboard/Frontend Connectivity
  async testDashboardConnectivity() {
    const testName = 'Dashboard Connectivity';
    try {
      const response = await axios.get(`http://localhost:3000`, {
        timeout: 10000,
        validateStatus: (status) => status < 500
      });

      const isAccessible = response.status === 200;
      this.recordTest(testName, isAccessible,
        isAccessible ? 'Dashboard is accessible' : 'Dashboard not accessible',
        { status: response.status }
      );
      return isAccessible;
    } catch (error) {
      this.recordTest(testName, false, `Dashboard connectivity error: ${error.message}`);
      return false;
    }
  }

  // Test 7: Invalid Credentials Handling
  async testInvalidCredentialsHandling() {
    const testName = 'Invalid Credentials Handling';
    try {
      const response = await axios.post(`${this.baseURL}/api/auth/login`, {
        email: 'nonexistent@test.com',
        password: 'wrongpassword'
      }, {
        timeout: 5000,
        validateStatus: (status) => status < 500
      });

      const isCorrectlyRejected = response.status === 401 && !response.data.success;
      this.recordTest(testName, isCorrectlyRejected,
        isCorrectlyRejected ? 'Invalid credentials correctly rejected' : 'Invalid credentials not properly handled',
        { status: response.status, data: response.data }
      );
      return isCorrectlyRejected;
    } catch (error) {
      this.recordTest(testName, false, `Invalid credentials test error: ${error.message}`);
      return false;
    }
  }

  // Test 8: Expired/Invalid Token Handling
  async testInvalidTokenHandling() {
    const testName = 'Invalid Token Handling';
    try {
      const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      
      const response = await axios.post(`${this.authServiceURL}/validate-token`, {}, {
        headers: {
          'Authorization': `Bearer ${fakeToken}`
        },
        timeout: 5000,
        validateStatus: (status) => status < 500
      });

      const isCorrectlyRejected = response.status === 401 && !response.data.success;
      this.recordTest(testName, isCorrectlyRejected,
        isCorrectlyRejected ? 'Invalid token correctly rejected' : 'Invalid token not properly handled',
        response.data
      );
      return isCorrectlyRejected;
    } catch (error) {
      this.recordTest(testName, false, `Invalid token test error: ${error.message}`);
      return false;
    }
  }

  // Test 9: Service Integration Test
  async testServiceIntegration(user) {
    if (!user || !user.token) {
      this.recordTest(`Service Integration - ${user?.email || 'Unknown'}`, false, 'No authenticated user available');
      return false;
    }

    const testName = `Service Integration - ${user.email}`;
    
    // Test multiple service endpoints that require authentication
    const endpoints = [
      { name: 'Questionnaire Service', url: 'http://localhost:5002/api/health' },
      { name: 'Analysis Service', url: 'http://localhost:5004/health' },
      { name: 'Report Service', url: 'http://localhost:5005/health' },
      { name: 'Payment Service', url: 'http://localhost:5003/api/health' }
    ];

    let allServicesHealthy = true;
    const serviceResults = [];

    for (const endpoint of endpoints) {
      try {
        const response = await axios.get(endpoint.url, { 
          timeout: 5000,
          validateStatus: (status) => status < 500
        });
        
        const isHealthy = response.status === 200;
        serviceResults.push({ service: endpoint.name, healthy: isHealthy, status: response.status });
        
        if (!isHealthy) {
          allServicesHealthy = false;
        }
      } catch (error) {
        serviceResults.push({ service: endpoint.name, healthy: false, error: error.message });
        allServicesHealthy = false;
      }
    }

    this.recordTest(testName, allServicesHealthy,
      allServicesHealthy ? 'All services are healthy' : 'Some services are unhealthy',
      serviceResults
    );
    return allServicesHealthy;
  }

  // Run all tests
  async runAllTests() {
    console.log('🚀 Starting Comprehensive Authentication E2E Test Suite');
    console.log('========================================================\n');

    // Phase 1: Infrastructure Health Checks
    console.log('📋 Phase 1: Infrastructure Health Checks');
    console.log('─'.repeat(50));
    
    const authHealthy = await this.testAuthServiceHealth();
    const gatewayHealthy = await this.testAPIGatewayHealth();
    await this.testDashboardConnectivity();

    if (!authHealthy || !gatewayHealthy) {
      console.log('\n🚨 Critical infrastructure issues detected. Stopping tests.');
      return this.generateReport();
    }

    // Phase 2: Authentication Flow Tests
    console.log('\n📋 Phase 2: Authentication Flow Tests');
    console.log('─'.repeat(50));
    
    const authenticatedUsers = [];
    for (const user of this.testUsers) {
      const authenticatedUser = await this.testUserAuthentication(user);
      if (authenticatedUser) {
        authenticatedUsers.push(authenticatedUser);
      }
    }

    // Phase 3: Token and Authorization Tests
    console.log('\n📋 Phase 3: Token and Authorization Tests');
    console.log('─'.repeat(50));
    
    for (const user of authenticatedUsers) {
      await this.testTokenValidation(user);
      await this.testProtectedRouteAccess(user);
    }

    // Phase 4: Error Handling Tests
    console.log('\n📋 Phase 4: Error Handling Tests');
    console.log('─'.repeat(50));
    
    await this.testInvalidCredentialsHandling();
    await this.testInvalidTokenHandling();

    // Phase 5: Service Integration Tests
    console.log('\n📋 Phase 5: Service Integration Tests');
    console.log('─'.repeat(50));
    
    if (authenticatedUsers.length > 0) {
      await this.testServiceIntegration(authenticatedUsers[0]);
    }

    return this.generateReport();
  }

  // Generate final test report
  generateReport() {
    const successRate = ((this.testResults.passed / this.testResults.total) * 100).toFixed(1);
    
    console.log('\n\n📊 TEST RESULTS SUMMARY');
    console.log('========================');
    console.log(`✅ Passed: ${this.testResults.passed}`);
    console.log(`❌ Failed: ${this.testResults.failed}`);
    console.log(`📈 Success Rate: ${successRate}%`);
    console.log(`📋 Total Tests: ${this.testResults.total}`);

    if (this.testResults.failed > 0) {
      console.log('\n🚨 FAILED TESTS:');
      console.log('─'.repeat(30));
      this.testResults.details
        .filter(test => !test.passed)
        .forEach(test => {
          console.log(`❌ ${test.test}: ${test.message}`);
        });
    }

    console.log('\n🎯 RECOMMENDATIONS:');
    console.log('─'.repeat(30));
    
    if (successRate >= 95) {
      console.log('🟢 EXCELLENT: Authentication system is highly reliable');
      console.log('   - All critical flows are working correctly');
      console.log('   - Continue running this test suite regularly');
    } else if (successRate >= 80) {
      console.log('🟡 GOOD: Authentication system is mostly functional');
      console.log('   - Some minor issues detected');
      console.log('   - Review failed tests and address issues');
    } else {
      console.log('🔴 CRITICAL: Authentication system has significant issues');
      console.log('   - Multiple failures detected');
      console.log('   - Immediate attention required');
      console.log('   - DO NOT DEPLOY until issues are resolved');
    }

    console.log('\n💡 NEXT STEPS:');
    console.log('─'.repeat(30));
    console.log('1. Run this test after any authentication-related changes');
    console.log('2. Add this test to your CI/CD pipeline');
    console.log('3. Monitor authentication metrics in production');
    console.log('4. Set up alerts for authentication failures');

    return {
      success: successRate >= 95,
      successRate: parseFloat(successRate),
      results: this.testResults
    };
  }
}

// Run the test suite
async function main() {
  const testSuite = new AuthTestSuite();
  const results = await testSuite.runAllTests();
  
  // Exit with appropriate code for CI/CD
  process.exit(results.success ? 0 : 1);
}

// Handle script execution
if (require.main === module) {
  main().catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });
}

module.exports = AuthTestSuite;
