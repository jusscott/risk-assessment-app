/**
 * Enhanced Error Scenarios Tests
 * 
 * These tests verify how the system handles various error scenarios,
 * focusing on service communication failures, error handling, and recovery.
 */

const axios = require('axios');
const { expect } = require('chai');
const { environment, reporting } = require('../scripts/test-utils');
const { sleep } = require('../scripts/test-utils').helpers;

// Load test factories
const factories = require('../factories');

// Configuration
const API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://localhost:3000';
const CIRCUIT_BREAKER_MONITOR_URL = process.env.CIRCUIT_BREAKER_MONITOR_URL || 'http://localhost:3010';

// Test data
let testUser;
let testToken;

/**
 * Helper: Make authenticated request with optional failure simulation
 */
async function makeRequest(options) {
  const {
    method = 'get',
    endpoint,
    data = null,
    headers = {},
    simulateFailure = false,
    failureType = 'timeout',
    delayMs = 0
  } = options;

  // Add authentication if token is available
  if (testToken) {
    headers.Authorization = `Bearer ${testToken}`;
  }

  // Add failure simulation headers if requested
  if (simulateFailure) {
    headers['X-Simulate-Failure'] = failureType;
    
    if (failureType === 'timeout' || failureType === 'slow-response') {
      headers['X-Failure-Delay'] = delayMs.toString();
    }
  }

  try {
    // Add delay for simulating network latency if needed
    if (delayMs > 0 && !simulateFailure) {
      await sleep(delayMs);
    }

    // Make the request
    const config = { headers };
    
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
    return error.response || { status: 500, data: { error: 'Request failed' } };
  }
}

/**
 * Helper: Reset all failure simulations
 */
async function resetFailureSimulations() {
  try {
    await axios.post(`${API_GATEWAY_URL}/test/reset-failures`);
  } catch (error) {
    console.warn('Failed to reset failure simulations');
  }
}

/**
 * Main test runner
 */
async function runTests() {
  // Setup reporting
  const testSuite = reporting.createTestSuite('Enhanced Error Scenarios Tests');
  
  // Setup test environment
  console.log('Setting up test environment...');
  await environment.ensureServicesRunning();
  await resetFailureSimulations();
  
  // Create test user for authenticated requests
  testUser = await factories.user.create({
    email: `error-test-${Date.now()}@example.com`,
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
  
  console.log('Starting enhanced error scenarios tests...');
  
  try {
    // Test 1: Handling Timeout Errors
    testSuite.addTest('Timeout Error Handling', async () => {
      // Make a request that will time out
      const response = await makeRequest({
        endpoint: '/reports/list',
        simulateFailure: true,
        failureType: 'timeout',
        delayMs: 5000
      });
      
      // Verify the system handles the timeout gracefully
      expect(response.status).to.equal(503);
      expect(response.data).to.have.property('error');
      expect(response.data.error).to.include('timeout');
      expect(response.data).to.have.property('retryAfter');
      
      // Reset for next test
      await resetFailureSimulations();
      await sleep(1000);
    });
    
    // Test 2: Partial Response Handling
    testSuite.addTest('Partial Response Handling', async () => {
      // Create a test questionnaire to work with
      const questionnaire = await factories.questionnaire.create({
        userId: testUser.id,
        title: 'Test Questionnaire for Error Handling'
      });
      
      // Make a request that will return partial data
      const response = await makeRequest({
        endpoint: `/dashboard/questionnaire/${questionnaire.id}/details`,
        simulateFailure: true,
        failureType: 'partial-data'
      });
      
      // Verify the system returns what data it can with appropriate status
      expect(response.status).to.equal(206);
      expect(response.data).to.have.property('questionnaire');
      expect(response.data).to.have.property('partial');
      expect(response.data.partial).to.be.true;
      expect(response.data).to.have.property('missingComponents');
      expect(response.data.missingComponents).to.be.an('array').that.is.not.empty;
      
      // Clean up
      await factories.questionnaire.destroy(questionnaire.id);
      await resetFailureSimulations();
      await sleep(1000);
    });
    
    // Test 3: Connection Reset Error Handling
    testSuite.addTest('Connection Reset Error Handling', async () => {
      // Make a request that will simulate a connection reset
      const response = await makeRequest({
        endpoint: '/analysis/status',
        simulateFailure: true,
        failureType: 'connection-reset'
      });
      
      // Verify the system handles the connection reset gracefully
      expect(response.status).to.equal(502);
      expect(response.data).to.have.property('error');
      expect(response.data.error).to.include('connection');
      expect(response.data).to.have.property('retryable');
      expect(response.data.retryable).to.be.true;
      
      // Reset for next test
      await resetFailureSimulations();
      await sleep(1000);
    });
    
    // Test 4: Service Unavailable Error Handling
    testSuite.addTest('Service Unavailable Error Handling', async () => {
      // Make a request to a service that will be simulated as unavailable
      const response = await makeRequest({
        endpoint: '/payments/status',
        simulateFailure: true,
        failureType: 'service-unavailable'
      });
      
      // Verify the system handles the unavailable service gracefully
      expect(response.status).to.equal(503);
      expect(response.data).to.have.property('error');
      expect(response.data.error).to.include('unavailable');
      expect(response.data).to.have.property('retryAfter');
      
      // Reset for next test
      await resetFailureSimulations();
      await sleep(1000);
    });
    
    // Test 5: Malformed Response Handling
    testSuite.addTest('Malformed Response Handling', async () => {
      // Make a request that will return a malformed response
      const response = await makeRequest({
        endpoint: '/reports/templates',
        simulateFailure: true,
        failureType: 'malformed-response'
      });
      
      // Verify the system handles the malformed response gracefully
      expect(response.status).to.equal(500);
      expect(response.data).to.have.property('error');
      expect(response.data.error).to.include('malformed');
      expect(response.data).to.have.property('errorType');
      expect(response.data.errorType).to.equal('parsing_error');
      
      // Reset for next test
      await resetFailureSimulations();
      await sleep(1000);
    });
    
    // Test 6: Error During Complex Operation
    testSuite.addTest('Error During Complex Operation', async () => {
      // Create a test questionnaire to work with
      const questionnaire = await factories.questionnaire.create({
        userId: testUser.id,
        title: 'Test Questionnaire for Complex Error'
      });
      
      // Start a complex operation (generate report) that will fail partway through
      const response = await makeRequest({
        method: 'post',
        endpoint: '/reports/generate',
        data: {
          questionnaireId: questionnaire.id,
          options: { format: 'pdf' }
        },
        simulateFailure: true,
        failureType: 'mid-operation-failure'
      });
      
      // Verify the system provides appropriate error information
      expect(response.status).to.equal(500);
      expect(response.data).to.have.property('error');
      expect(response.data).to.have.property('operationId');
      expect(response.data).to.have.property('phase');
      expect(response.data).to.have.property('completedSteps');
      expect(response.data.completedSteps).to.be.an('array');
      expect(response.data).to.have.property('failedStep');
      
      // Check the operation status to verify it's properly tracked
      const statusResponse = await makeRequest({
        endpoint: `/operations/${response.data.operationId}/status`
      });
      
      expect(statusResponse.status).to.equal(200);
      expect(statusResponse.data).to.have.property('status');
      expect(statusResponse.data.status).to.equal('failed');
      expect(statusResponse.data).to.have.property('error');
      
      // Clean up
      await factories.questionnaire.destroy(questionnaire.id);
      await resetFailureSimulations();
      await sleep(1000);
    });
    
    // Test 7: Recovery After Multiple Failures
    testSuite.addTest('Recovery After Multiple Failures', async () => {
      // Make several requests that will fail
      for (let i = 0; i < 3; i++) {
        await makeRequest({
          endpoint: '/auth/status',
          simulateFailure: true,
          failureType: 'timeout'
        });
      }
      
      // Reset the failure simulation
      await resetFailureSimulations();
      
      // Make a request that should now succeed
      const response = await makeRequest({
        endpoint: '/auth/status'
      });
      
      // Verify the system recovers properly
      expect(response.status).to.equal(200);
      expect(response.data).to.have.property('status');
      expect(response.data.status).to.equal('authenticated');
      
      await sleep(1000);
    });
    
  } catch (error) {
    console.error('Test failed:', error);
    testSuite.addFailure('Unexpected test failure', error);
  } finally {
    // Cleanup
    console.log('Cleaning up test resources...');
    await resetFailureSimulations();
    
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
