/**
 * Health Check Controller
 * Provides detailed health status for the API Gateway and its dependencies
 */

const axios = require('axios');
const { getRedisClient, isRedisReady } = require('../config/redis.config');

/**
 * Get detailed health status of the API Gateway and its dependencies
 */
const getHealthStatus = async (req, res) => {
  try {
    const health = {
      status: 'UP',
      timestamp: new Date().toISOString(),
      dependencies: {
        redis: {
          status: isRedisReady() ? 'UP' : 'DOWN'
        }
      },
      services: {}
    };
    
    // Get service URLs from config
    const serviceUrlConfig = require('../config/service-url.config');
    const serviceUrls = {
      auth: serviceUrlConfig.getServiceUrl('AUTH', 'http://auth-service:5001'),
      questionnaire: serviceUrlConfig.getServiceUrl('QUESTIONNAIRE', 'http://questionnaire-service:5002'),
      payment: serviceUrlConfig.getServiceUrl('PAYMENT', 'http://payment-service:5003/api'),
      analysis: serviceUrlConfig.getServiceUrl('ANALYSIS', 'http://analysis-service:5004/api'),
      report: serviceUrlConfig.getServiceUrl('REPORT', 'http://report-service:5005/api')
    };
    
    // Check each service health
    const serviceChecks = Object.entries(serviceUrls).map(async ([name, url]) => {
      try {
        // Add /health to base URL
        const healthUrl = url.endsWith('/') ? url + 'health' : url + '/health';
        const response = await axios.get(healthUrl, { timeout: 2000 });
        health.services[name] = {
          status: 'UP',
          url: healthUrl
        };
      } catch (error) {
        health.services[name] = {
          status: 'DOWN',
          url: url,
          error: error.message
        };
        // If any service is down, mark overall status as degraded
        health.status = 'DEGRADED';
      }
    });
    
    // Wait for all service checks to complete
    await Promise.all(serviceChecks);
    
    // Return health status
    res.json(health);
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
};

module.exports = {
  getHealthStatus
};
