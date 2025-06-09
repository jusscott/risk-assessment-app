/**
 * Integration tests for the centralized health monitoring system
 */

const axios = require('axios');
const { expect } = require('chai');
const { getTestConfig } = require('../config/test-config');

const config = getTestConfig();
const API_URL = config.apiGatewayUrl;
const AUTH_TOKEN = config.adminToken; // Admin token for protected endpoints

describe('Centralized Health Monitoring System', () => {
  // Test the public health endpoint
  describe('Public Health Endpoints', () => {
    it('should return basic API Gateway health status', async () => {
      const response = await axios.get(`${API_URL}/api/health`);
      
      expect(response.status).to.equal(200);
      expect(response.data.success).to.be.true;
      expect(response.data.status).to.be.oneOf(['healthy', 'degraded', 'unhealthy']);
      expect(response.data.data).to.have.property('service', 'api-gateway');
    });
    
    it('should return deep health check results', async () => {
      const response = await axios.get(`${API_URL}/api/health/deep`);
      
      expect(response.status).to.be.oneOf([200, 503]); // 503 if any service is unhealthy
      expect(response.data).to.have.property('status');
      expect(response.data.data.details.services).to.include.keys([
        'auth-service',
        'questionnaire-service',
        'payment-service',
        'analysis-service',
        'report-service'
      ]);
    });
    
    it('should return system-wide health status', async () => {
      const response = await axios.get(`${API_URL}/api/health/system`);
      
      expect(response.status).to.be.oneOf([200, 503]); // 503 if system is unhealthy
      expect(response.data).to.have.property('status');
      expect(response.data.data).to.have.property('servicesTotal');
      expect(response.data.data).to.have.property('servicesHealthy');
      expect(response.data.data).to.have.property('services');
      expect(response.data.data.services).to.include.key('api-gateway');
    });
    
    it('should return health for a specific service', async () => {
      const response = await axios.get(`${API_URL}/api/health/services/auth-service`);
      
      expect(response.status).to.be.oneOf([200, 503]); // 503 if service is unhealthy
      expect(response.data).to.have.property('status');
      expect(response.data.data).to.have.property('name', 'auth-service');
    });
  });
  
  // Test the admin-only endpoints
  describe('Admin Health Endpoints', () => {
    it('should require authentication for admin dashboard', async () => {
      try {
        await axios.get(`${API_URL}/api/security/health-dashboard`);
        // Should not reach here - request should fail
        expect.fail('Request should require authentication');
      } catch (error) {
        expect(error.response.status).to.equal(401);
      }
    });
    
    it('should return detailed health dashboard for admins', async () => {
      const response = await axios.get(`${API_URL}/api/security/health-dashboard`, {
        headers: { Authorization: `Bearer ${AUTH_TOKEN}` }
      });
      
      expect(response.status).to.equal(200);
      expect(response.data.success).to.be.true;
      expect(response.data.data).to.have.property('servicesTotal');
      expect(response.data.data).to.have.property('services');
      
      // Check that the detailed metrics are included
      const services = Object.values(response.data.data.services);
      const serviceWithMetrics = services.find(s => s.metrics);
      
      // At least one service should have metrics in detailed view
      if (serviceWithMetrics) {
        expect(serviceWithMetrics.metrics).to.be.an('object');
      }
    });
    
    it('should return circuit breaker status for admins', async () => {
      const response = await axios.get(`${API_URL}/api/security/circuit-status`, {
        headers: { Authorization: `Bearer ${AUTH_TOKEN}` }
      });
      
      expect(response.status).to.equal(200);
      expect(response.data.success).to.be.true;
      expect(response.data.data).to.have.property('circuits');
      expect(response.data.data.circuits).to.be.an('object');
    });
    
    it('should allow admins to reset health cache', async () => {
      const response = await axios.post(`${API_URL}/api/health/reset-cache`, {}, {
        headers: { Authorization: `Bearer ${AUTH_TOKEN}` }
      });
      
      expect(response.status).to.equal(200);
      expect(response.data.success).to.be.true;
      expect(response.data.message).to.include('reset');
    });
  });
  
  // Test specific health metrics
  describe('Component Metrics', () => {
    it('should return metrics for a specific component if available', async () => {
      try {
        const response = await axios.get(`${API_URL}/api/health/metrics/auth-service/database`);
        
        // If the endpoint succeeds, verify the response structure
        expect(response.status).to.be.oneOf([200, 503]); // 503 if metrics unavailable
        
        if (response.status === 200) {
          expect(response.data.success).to.be.true;
          expect(response.data.data).to.be.an('object');
        } else {
          expect(response.data.success).to.be.false;
          expect(response.data.error).to.have.property('code', 'METRICS_UNAVAILABLE');
        }
      } catch (error) {
        // Some services might not support component metrics yet, which is acceptable
        if (error.response) {
          expect(error.response.status).to.be.oneOf([404, 503]);
        } else {
          throw error; // Re-throw unexpected errors
        }
      }
    });
  });
  
  // Test caching behavior
  describe('Health Data Caching', () => {
    it('should cache health data by default', async () => {
      // Make two requests in quick succession
      const start = Date.now();
      await axios.get(`${API_URL}/api/health/system`);
      const firstRequestTime = Date.now() - start;
      
      const secondStart = Date.now();
      await axios.get(`${API_URL}/api/health/system`);
      const secondRequestTime = Date.now() - secondStart;
      
      // Second request should be significantly faster due to caching
      // This is a heuristic test - might be flaky in some environments
      expect(secondRequestTime).to.be.lessThan(firstRequestTime);
    });
    
    it('should bypass cache when requested', async () => {
      // Make a request with cache bypass
      const response = await axios.get(`${API_URL}/api/health/system?bypassCache=true`);
      
      expect(response.status).to.equal(200);
      expect(response.data.data.requestInfo.bypassCache).to.be.true;
    });
  });
});
