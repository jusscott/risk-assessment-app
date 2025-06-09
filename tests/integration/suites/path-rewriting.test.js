/**
 * Path Rewriting Integration Tests
 * 
 * Tests that verify API Gateway path rewriting functionality
 * across all microservices to ensure proper routing.
 */

const axios = require('axios');
const { expect } = require('chai');
const { setupTestEnvironment, teardownTestEnvironment } = require('../scripts/test-utils');
const factories = require('../factories');
const config = require('../config/test-config');
const pathConfig = require('../../../backend/api-gateway/src/config/path-rewrite.config');

// Test configuration
const API_URL = config.apiGatewayUrl;
let authToken;
let testUser;

describe('Path Rewriting Integration Tests', function() {
  // Use longer timeout for potentially slower integration tests
  this.timeout(10000);

  // Set up test environment before all tests
  before(async function() {
    try {
      await setupTestEnvironment();
      
      // Create test user and get auth token
      testUser = await factories.user.create({
        email: `path-test-${Date.now()}@example.com`,
        password: 'Test1234!',
        firstName: 'Path',
        lastName: 'Test', 
        role: 'user'
      });
      
      const authResponse = await axios.post(`${API_URL}/api/auth/login`, {
        email: testUser.email,
        password: 'Test1234!'
      });
      
      authToken = authResponse.data.data.token;
      expect(authToken).to.be.a('string');
    } catch (error) {
      console.error('Error setting up test environment:', error);
      throw error;
    }
  });
  
  // Clean up after all tests
  after(async function() {
    await teardownTestEnvironment();
  });

  describe('Auth Service Path Mapping Tests', function() {
    it('should correctly route auth login requests', async function() {
      const response = await axios.post(`${API_URL}/api/auth/login`, {
        email: testUser.email,
        password: 'Test1234!'
      });
      
      expect(response.status).to.equal(200);
      expect(response.data).to.have.property('success', true);
      expect(response.data.data).to.have.property('token');
    });
    
    it('should correctly route auth user profile requests', async function() {
      const response = await axios.get(`${API_URL}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      
      expect(response.status).to.equal(200);
      expect(response.data).to.have.property('success', true);
      expect(response.data.data).to.have.property('user');
      expect(response.data.data.user).to.have.property('email', testUser.email);
    });
  });
  
  describe('Questionnaire Service Path Mapping Tests', function() {
    it('should correctly route questionnaire templates requests', async function() {
      const response = await axios.get(`${API_URL}/api/questionnaires/templates`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      
      expect(response.status).to.equal(200);
      expect(response.data).to.have.property('success', true);
      expect(response.data.data).to.have.property('templates');
      expect(response.data.data.templates).to.be.an('array');
    });
    
    it('should correctly route diagnostic requests (public endpoint)', async function() {
      const response = await axios.get(`${API_URL}/api/questionnaires/diagnostic/status`);
      
      expect(response.status).to.equal(200);
      expect(response.data).to.have.property('success', true);
      expect(response.data.data).to.have.property('status');
    });
  });
  
  describe('Payment Service Path Mapping Tests', function() {
    it('should correctly route payment plans requests (public endpoint)', async function() {
      const response = await axios.get(`${API_URL}/api/payments/plans`);
      
      expect(response.status).to.equal(200);
      expect(response.data).to.have.property('success', true);
      expect(response.data.data).to.have.property('plans');
      expect(response.data.data.plans).to.be.an('array');
    });
  });
  
  describe('Report Service Path Mapping Tests', function() {
    it('should correctly route reports list requests', async function() {
      const response = await axios.get(`${API_URL}/api/reports`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      
      expect(response.status).to.equal(200);
      expect(response.data).to.have.property('success', true);
      expect(response.data.data).to.have.property('reports');
      expect(response.data.data.reports).to.be.an('array');
    });
  });
  
  describe('Analysis Service Path Mapping Tests', function() {
    it('should correctly route analysis status requests', async function() {
      const response = await axios.get(`${API_URL}/api/analysis/status`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      
      expect(response.status).to.equal(200);
      expect(response.data).to.have.property('success', true);
      expect(response.data.data).to.have.property('status');
    });
  });
  
  describe('Path Validation Tests', function() {
    it('should validate all API Gateway route configurations against path-rewrite config', function() {
      // This test verifies that all configured routes in the API Gateway
      // are consistent with the path-rewrite.config.js definitions
      
      // Get all service identifiers from path config
      const services = Object.keys(pathConfig).filter(key => typeof pathConfig[key] === 'object');
      
      // Ensure all core services are configured
      const requiredServices = ['auth', 'questionnaire', 'payment', 'analysis', 'report'];
      requiredServices.forEach(service => {
        expect(services).to.include(service, `Missing path configuration for ${service} service`);
      });
      
      // Verify external prefixes are correctly formatted
      services.forEach(service => {
        const config = pathConfig[service];
        expect(config).to.have.property('externalPrefix');
        expect(config.externalPrefix).to.match(/^\/api\/[a-z]+s?$/,
          `External prefix for ${service} should match pattern /api/servicename format`);
      });
    });
    
    it('should ensure each service has required path rewriting configuration', function() {
      // Get all service identifiers from path config
      const services = Object.keys(pathConfig).filter(key => typeof pathConfig[key] === 'object');
      
      services.forEach(service => {
        const config = pathConfig[service];
        
        // Each service should have basic properties
        expect(config, `${service} is missing required properties`).to.have.property('externalPrefix');
        expect(config, `${service} is missing required properties`).to.have.property('internalPrefix');
        
        // Each service should have a generatePathRewrite method
        expect(pathConfig.generatePathRewrite).to.be.a('function');
        
        // Test generatePathRewrite function for each service
        const pathRewrites = pathConfig.generatePathRewrite(service);
        expect(pathRewrites, `generatePathRewrite not working for ${service}`).to.be.an('object');
        expect(Object.keys(pathRewrites).length).to.be.greaterThan(0, 
          `No path rewrite rules generated for ${service}`);
      });
    });
    
    it('should ensure path rewrite rules handle edge cases properly', function() {
      // Test special characters and edge case paths
      const specialPaths = [
        {
          service: 'questionnaire', 
          input: '/api/questionnaires/templates/123/sections/456?filter=active&sort=name',
          expected: '/templates/123/sections/456?filter=active&sort=name'
        },
        {
          service: 'payment',
          input: '/api/payments/subscriptions/abc-123/invoices',
          expected: '/payments/subscriptions/abc-123/invoices'
        },
        {
          service: 'report',
          input: '/api/reports/download/pdf/123-456-789.pdf',
          expected: '/reports/download/pdf/123-456-789.pdf'
        }
      ];
      
      specialPaths.forEach(testCase => {
        const rewrite = pathConfig.generatePathRewrite(testCase.service);
        let transformed = testCase.input;
        
        // Apply each rewrite rule
        Object.entries(rewrite).forEach(([pattern, replacement]) => {
          transformed = transformed.replace(new RegExp(pattern), replacement);
        });
        
        expect(transformed).to.equal(testCase.expected, 
          `Path rewrite failed for ${testCase.service}: ${testCase.input}`);
      });
    });
  });
  
  describe('Error Path Tests', function() {
    it('should handle non-existent endpoints with 404 error', async function() {
      try {
        await axios.get(`${API_URL}/api/not-a-real-endpoint`, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        // Should never reach here
        expect.fail('Expected 404 error for non-existent endpoint');
      } catch (error) {
        expect(error.response.status).to.equal(404);
        expect(error.response.data).to.have.property('success', false);
        expect(error.response.data).to.have.property('error');
      }
    });
    
    it('should handle incorrect path format with appropriate error', async function() {
      try {
        // Intentionally malformed path
        await axios.get(`${API_URL}/api/auth//malformed//path`, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        // Should never reach here - either 404 or other error expected
        expect.fail('Expected error for malformed path');
      } catch (error) {
        // We don't test for specific status code as it could be handled differently
        // Just verify it returns an error response
        expect(error.response).to.have.property('status');
        expect(error.response.status).to.be.at.least(400);
      }
    });
  });
});
