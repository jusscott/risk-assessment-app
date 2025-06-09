/**
 * Service Communication Resilience Tests
 * 
 * These tests verify the resilience mechanisms in service-to-service 
 * communication, including circuit breakers, retries, and graceful degradation.
 */

const axios = require('axios');
const { expect } = require('chai');
const sinon = require('sinon');
const { environment, reporting } = require('../scripts/test-utils');
const { sleep, retry } = require('../scripts/test-utils').helpers;

// Load test factories
const factories = require('../factories');

// Configuration
const TEST_TIMEOUT = 30000; // 30 seconds timeout for tests
const API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://localhost:3000';
const CIRCUIT_BREAKER_MONITOR_URL = process.env.CIRCUIT_BREAKER_MONITOR_URL || 'http://localhost:3010';

// Test data
let testUser;
let testToken;

/**
 * Helper: Reset circuit breakers
 */
async function resetCircuitBreakers() {
  try {
    await axios.post(`${CIRCUIT_BREAKER_MONITOR_URL}/reset-all`);
    // Allow time for reset to take effect
    await sleep(1000);
  } catch (error) {
    console.warn('Failed to reset circuit breakers. Tests may be affected.');
  }
}

/**
 * Helper: Trigger a service failure
 */
async function triggerServiceFailure(service, duration = 5000) {
  try {
    // Trigger failure mode in the specified service
    await axios.post(`${CIRCUIT_BREAKER_MONITOR_URL}/trigger-failure`, {
      service,
      duration
    });
    // Allow time for failure to register
    await sleep(1000);
  } catch (error) {
    console.warn(`Failed to trigger failure for ${service}. Tests may be affected.`);
  }
}

/**
 * Helper: Get circuit breaker status
 */
async function getCircuitBreakerStatus(service) {
  try {
    const response = await axios.get(`${CIRCUIT_BREAKER_MONITOR_URL}/status/${service}`);
    return response.data;
  } catch (error) {
    console.warn(`Failed to get circuit breaker status for ${service}.`);
    return null;
  }
}

/**
 * Helper: Make authenticated request
 */
async function makeAuthenticatedRequest(method, endpoint, data = null) {
  try {
    const config = {
      headers: { Authorization: `Bearer ${testToken}` }
    };
    
    if (method.toLowerCase() === 'get') {
      return await axios.get(`${API_GATEWAY_URL}${endpoint}`, config);
    } else if (method.toLowerCase() === 'post') {
      return await axios.post(`${API_GATEWAY_URL}${endpoint}`, data, config);
    } else if (method.toLowerCase() === 'put') {
      return await axios.put(`${API_GATEWAY_URL}${endpoint}`, data, config);
    } else if (method.toLowerCase() === 'delete') {
      return await axios.delete(`${API_GATEWAY_URL}${endpoint}`, config);
    }
  } catch (error) {
    return error.response;
  }
}

/**
 * Helper: Check health endpoints
 */
async function checkServiceHealth(service) {
  try {
    const response = await axios.get(`${API_GATEWAY_URL}/health/${service}`);
    return response.data;
  } catch (error) {
    return null;
  }
}

/**
 * Main test runner
 */
async function runTests() {
  // Setup reporting
  const testSuite = reporting.createTestSuite('Service Resilience Tests');
  
  // Setup test environment
  console.log('Setting up test environment...');
  await environment.ensureServicesRunning();
  await resetCircuitBreakers();
  
  // Create test user for authenticated requests
  testUser = await factories.user.create({
    email: `resilience-test-${Date.now()}@example.com`,
    password: 'Password123!'
  });
  
  // Authenticate to get token
  try {
    const authResponse = await axios.post(`${API_GATEWAY_URL}/auth/login`, {
      email: testUser.email,
      password: 'Password123!'
    });
    testToken = authResponse.data.token;
  } catch (error) {
    console.error('Authentication failed:', error.message);
    process.exit(1);
  }
  
  console.log('Starting resilience tests...');
  
  try {
    // Test 1: Circuit Breaker Activation
    testSuite.addTest('Circuit Breaker Activation', async () => {
      // Trigger payment service failure
      await triggerServiceFailure('payment-service');
      
      // Make requests to payment service and verify circuit breaker opens
      let attempts = 0;
      let circuitOpen = false;
      
      while (attempts < 5 && !circuitOpen) {
        attempts++;
        
        // Make request that would go to payment service
        await makeAuthenticatedRequest('get', '/payments/status');
        
        // Check circuit breaker status
        const status = await getCircuitBreakerStatus('payment-service');
        circuitOpen = status && status.state === 'open';
        
        if (!circuitOpen) {
          await sleep(1000);
        }
      }
      
      expect(circuitOpen).to.be.true;
      
      // Reset for next test
      await resetCircuitBreakers();
      await sleep(2000);
    });
    
    // Test 2: Circuit Breaker Recovery
    testSuite.addTest('Circuit Breaker Recovery', async () => {
      // Trigger report service failure with shorter duration
      await triggerServiceFailure('report-service', 3000);
      
      // Make requests to report service to trip circuit breaker
      for (let i = 0; i < 3; i++) {
        await makeAuthenticatedRequest('get', '/reports/status');
        await sleep(500);
      }
      
      // Verify circuit breaker opened
      let status = await getCircuitBreakerStatus('report-service');
      expect(status.state).to.equal('open');
      
      // Wait for recovery
      console.log('Waiting for circuit breaker recovery...');
      await sleep(5000);
      
      // Make request after recovery
      await makeAuthenticatedRequest('get', '/reports/status');
      
      // Verify circuit breaker closed
      status = await getCircuitBreakerStatus('report-service');
      expect(status.state).to.equal('closed');
      
      // Reset for next test
      await resetCircuitBreakers();
      await sleep(2000);
    });
    
    // Test 3: Retry Mechanism
    testSuite.addTest('Retry Mechanism', async () => {
      // Create a spy for retry logging
      const logSpy = sinon.spy(console, 'log');
      
      // Trigger analysis service failure with very short duration
      await triggerServiceFailure('analysis-service', 2000);
      
      // Make request that should trigger retries
      const response = await retry(
        async () => makeAuthenticatedRequest('get', '/analysis/status'),
        3,  // Retry 3 times
        1000 // Wait 1 second between retries
      );
      
      // Restore spy
      logSpy.restore();
      
      // Verify retry behavior
      const retryLogs = logSpy.args.filter(args => 
        typeof args[0] === 'string' && args[0].includes('Retrying')
      );
      
      expect(retryLogs.length).to.be.greaterThan(0);
      expect(response.status).to.equal(200);
      
      // Reset for next test
      await resetCircuitBreakers();
      await sleep(2000);
    });
    
    // Test 4: Graceful Degradation
    testSuite.addTest('Graceful Degradation', async () => {
      // Trigger questionnaire service failure
      await triggerServiceFailure('questionnaire-service');
      
      // Make request to dashboard which aggregates data from multiple services
      // This should return partial data with graceful degradation
      const response = await makeAuthenticatedRequest('get', '/dashboard/summary');
      
      // Verify the response indicates partial data
      expect(response.status).to.equal(206); // Partial Content
      expect(response.data).to.have.property('partial');
      expect(response.data.partial).to.be.true;
      expect(response.data).to.have.property('availableServices');
      expect(response.data.availableServices).not.to.include('questionnaire-service');
      
      // Reset circuit breakers
      await resetCircuitBreakers();
      await sleep(2000);
    });
    
    // Test 5: Health Check Integration
    testSuite.addTest('Health Check Integration', async () => {
      // Check all services are healthy initially
      const initialHealth = await checkServiceHealth('all');
      expect(initialHealth.status).to.equal('healthy');
      
      // Trigger payment service failure
      await triggerServiceFailure('payment-service');
      
      // Wait for health check to update
      await sleep(2000);
      
      // Verify payment service shows as unhealthy
      const currentHealth = await checkServiceHealth('all');
      expect(currentHealth.services['payment-service'].status).to.equal('unhealthy');
      
      // But overall system should still function
      expect(currentHealth.status).to.equal('degraded');
      
      // Reset circuit breakers
      await resetCircuitBreakers();
      await sleep(2000);
    });
    
    // Test 6: Fallback Functionality
    testSuite.addTest('Fallback Functionality', async () => {
      // Trigger analysis service failure
      await triggerServiceFailure('analysis-service');
      
      // Request a report that normally requires analysis service
      const response = await makeAuthenticatedRequest('post', '/reports/generate', {
        questionnaireId: 'test-questionnaire-id',
        options: { useFallback: true }
      });
      
      // Should get a basic report even with analysis service down
      expect(response.status).to.equal(202);
      expect(response.data).to.have.property('reportId');
      expect(response.data).to.have.property('fallbackUsed');
      expect(response.data.fallbackUsed).to.be.true;
      
      // Reset circuit breakers
      await resetCircuitBreakers();
      await sleep(2000);
    });
    
  } catch (error) {
    console.error('Test failed:', error);
    testSuite.addFailure('Unexpected test failure', error);
  } finally {
    // Cleanup
    console.log('Cleaning up test resources...');
    await resetCircuitBreakers();
    
    // Delete test user if possible
    try {
      if (testUser && testUser.id) {
        await factories.user.destroy(testUser.id);
      }
    } catch (error) {
      console.warn('Failed to clean up test user:', error.message);
    }
  }
  
  // Return test results
  return testSuite.getResults();
}

module.exports = { runTests };
