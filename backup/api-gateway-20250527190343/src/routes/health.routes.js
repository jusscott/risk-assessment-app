/**
 * Health check routes for the API Gateway
 * Includes both basic health checks and centralized service health monitoring
 */

const express = require('express');
const { getHealthStatus } = require('../controllers/health-check.controller');
const router = express.Router();
const { logger } = require('../middlewares/logging.middleware');
const { verifyToken, requireAdmin } = require('../middlewares/auth.middleware');
const { 
  getSystemHealth, 
  getServiceHealthDetails, 
  getServiceComponentMetrics,
  resetCaches 
} = require('../controllers/health-monitor.controller');

// Try to load axios, but don't fail if it's not available
let axios;
try {
  axios = require('axios');
  logger.info('Successfully loaded axios module');
} catch (error) {
  logger.warn('Could not load axios module, deep health checks will be limited', { error: error.message });
}

// Service URLs from environment with failover address resolution
const getServiceUrl = (serviceName, path = '/api/health') => {
  const envKey = `${serviceName.toUpperCase()}_SERVICE_URL`;
  const baseUrl = process.env[envKey] || `http://${serviceName}:${getServicePort(serviceName)}/api`;
  return `${baseUrl}${path}`;
};

// Default port mapping for services
const getServicePort = (serviceName) => {
  const portMap = {
    'auth-service': 5001,
    'questionnaire-service': 5002,
    'payment-service': 5003,
    'analysis-service': 5004,
    'report-service': 5005
  };
  return portMap[serviceName] || 5000;
};

// Helper function to get health check from a service
const getServiceHealth = async (serviceUrl) => {
  try {
    const response = await fetch(`${serviceUrl}/health`);
    if (!response.ok) {
      throw new Error(`Service returned status ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    logger.error(`Error getting service health: ${error.message}`);
    throw error;
  }
};

/**
 * @route GET /api/health
 * @desc Basic health check endpoint
 * @access Public
 */
router.get('/', async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      status: 'healthy', // Add top-level status field for test compatibility
      data: {
        service: 'api-gateway',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.API_VERSION || '1.0.0'
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      status: 'error',
      error: {
        code: 'HEALTH_CHECK_FAILED',
        message: 'Health check failed'
      }
    });
  }
});

/**
 * @route GET /api/health/deep
 * @desc Deep health check that tests all downstream services
 * @access Public
 */
router.get('/deep', async (req, res) => {
  try {
    // Services to check
    const services = [
      'auth-service',
      'questionnaire-service',
      'payment-service',
      'analysis-service',
      'report-service'
    ];
    
    const serviceStatuses = {};
    let overallStatus = 'healthy';
    
    // If axios is not available, return limited health check
    if (!axios) {
      logger.warn('Performing limited health check without axios');
      
      services.forEach(service => {
        serviceStatuses[service] = {
          status: 'unknown',
          error: 'Health check unavailable - axios module not installed'
        };
      });
      
    return res.status(200).json({
      success: true,
      status: 'limited',
      data: {
        service: 'api-gateway',
        status: 'limited',
        timestamp: new Date().toISOString(),
        version: process.env.API_VERSION || '1.0.0',
        details: {
          services: serviceStatuses,
          message: 'Limited health check - axios module not available for service checks'
        }
      }
    });
    }
    
    // Check each service in parallel
    const healthChecks = services.map(async (service) => {
      try {
        const url = getServiceUrl(service);
        const response = await axios.get(url, { timeout: 5000 });
        
        // Consider the service healthy if it returns a success response
        const isHealthy = response.data && response.data.success === true;
        const status = isHealthy ? 'healthy' : 'degraded';
        
        if (!isHealthy) {
          overallStatus = 'degraded';
        }
        
        return { 
          service, 
          status, 
          error: isHealthy ? null : 'Service reported unhealthy'
        };
      } catch (error) {
        overallStatus = 'degraded';
        
        return { 
          service, 
          status: 'unhealthy', 
          error: error.message
        };
      }
    });
    
    // Wait for all health checks to complete
    const results = await Promise.all(healthChecks);
    
    // Format the results
    results.forEach(result => {
      serviceStatuses[result.service] = {
        status: result.status,
        error: result.error
      };
    });
    
    return res.status(overallStatus === 'healthy' ? 200 : 503).json({
      success: overallStatus === 'healthy',
      status: overallStatus, // Add top-level status field for test compatibility
      data: {
        service: 'api-gateway',
        status: overallStatus,
        timestamp: new Date().toISOString(),
        version: process.env.API_VERSION || '1.0.0',
        details: {
          services: serviceStatuses
        }
      }
    });
  } catch (error) {
    logger.error('Error performing deep health check:', error);
    
    return res.status(500).json({
      success: false,
      status: 'error',
      error: {
        code: 'HEALTH_CHECK_FAILED',
        message: 'Health check failed',
        details: error.message
      }
    });
  }
});

/**
 * @route GET /api/auth/health
 * @desc Auth service health check endpoint
 * @access Public
 */
router.get('/auth', async (req, res) => {
  try {
    const authServiceUrl = getServiceUrl('auth-service', '');
    
    // Try to get health status from auth service
    let serviceResponse;
    
    try {
      if (axios) {
        const response = await axios.get(`${authServiceUrl}/api/health`, { timeout: 3000 });
        serviceResponse = response.data;
      } else {
        // Fallback to fetch if axios is not available
        serviceResponse = await getServiceHealth(`${authServiceUrl}/api`);
      }
      
      // Add top-level status field for test compatibility
      if (serviceResponse && !serviceResponse.status) {
        serviceResponse.status = serviceResponse.data?.status || 'healthy';
      }
      
      return res.status(200).json(serviceResponse);
    } catch (error) {
      logger.error(`Auth service health check failed: ${error.message}`);
      
      // Return a standardized error response
      return res.status(503).json({
        success: false,
        status: 'unhealthy',
        error: {
          code: 'AUTH_SERVICE_UNAVAILABLE',
          message: 'Auth service is currently unavailable',
          details: error.message
        }
      });
    }
  } catch (error) {
    logger.error(`Error in auth health route: ${error.message}`);
    
    return res.status(500).json({
      success: false,
      status: 'error',
      error: {
        code: 'HEALTH_CHECK_FAILED',
        message: 'Health check failed',
        details: error.message
      }
    });
  }
});

/**
 * @route GET /api/questionnaires/health
 * @desc Questionnaire service health check endpoint
 * @access Public
 */
router.get('/questionnaires', async (req, res) => {
  try {
    const questionnaireServiceUrl = getServiceUrl('questionnaire-service', '');
    
    // Try to get health status from questionnaire service
    let serviceResponse;
    
    try {
      if (axios) {
        const response = await axios.get(`${questionnaireServiceUrl}/api/health`, { timeout: 3000 });
        serviceResponse = response.data;
      } else {
        // Fallback to fetch if axios is not available
        serviceResponse = await getServiceHealth(`${questionnaireServiceUrl}/api`);
      }
      
      // Add top-level status field for test compatibility
      if (serviceResponse && !serviceResponse.status) {
        serviceResponse.status = serviceResponse.data?.status || 'healthy';
      }
      
      return res.status(200).json(serviceResponse);
    } catch (error) {
      logger.error(`Questionnaire service health check failed: ${error.message}`);
      
      // Return a standardized error response
      return res.status(503).json({
        success: false,
        status: 'unhealthy',
        error: {
          code: 'QUESTIONNAIRE_SERVICE_UNAVAILABLE',
          message: 'Questionnaire service is currently unavailable',
          details: error.message
        }
      });
    }
  } catch (error) {
    logger.error(`Error in questionnaire health route: ${error.message}`);
    
    return res.status(500).json({
      success: false,
      status: 'error',
      error: {
        code: 'HEALTH_CHECK_FAILED',
        message: 'Health check failed',
        details: error.message
      }
    });
  }
});

/**
 * @route GET /api/payments/health
 * @desc Payment service health check endpoint
 * @access Public
 */
router.get('/payments', async (req, res) => {
  try {
    const paymentServiceUrl = getServiceUrl('payment-service', '');
    
    // Try to get health status from payment service
    let serviceResponse;
    
    try {
      if (axios) {
        const response = await axios.get(`${paymentServiceUrl}/api/health`, { timeout: 3000 });
        serviceResponse = response.data;
      } else {
        // Fallback to fetch if axios is not available
        serviceResponse = await getServiceHealth(`${paymentServiceUrl}/api`);
      }
      
      // Add top-level status field for test compatibility
      if (serviceResponse && !serviceResponse.status) {
        serviceResponse.status = serviceResponse.data?.status || 'healthy';
      }
      
      return res.status(200).json(serviceResponse);
    } catch (error) {
      logger.error(`Payment service health check failed: ${error.message}`);
      
      // Return a standardized error response
      return res.status(503).json({
        success: false,
        status: 'unhealthy',
        error: {
          code: 'PAYMENT_SERVICE_UNAVAILABLE',
          message: 'Payment service is currently unavailable',
          details: error.message
        }
      });
    }
  } catch (error) {
    logger.error(`Error in payment health route: ${error.message}`);
    
    return res.status(500).json({
      success: false,
      status: 'error',
      error: {
        code: 'HEALTH_CHECK_FAILED',
        message: 'Health check failed',
        details: error.message
      }
    });
  }
});

/**
 * @route GET /api/analysis/health
 * @desc Analysis service health check endpoint
 * @access Public
 */
router.get('/analysis', async (req, res) => {
  try {
    const analysisServiceUrl = getServiceUrl('analysis-service', '');
    
    // Try to get health status from analysis service
    let serviceResponse;
    
    try {
      if (axios) {
        const response = await axios.get(`${analysisServiceUrl}/api/health`, { timeout: 3000 });
        serviceResponse = response.data;
      } else {
        // Fallback to fetch if axios is not available
        serviceResponse = await getServiceHealth(`${analysisServiceUrl}/api`);
      }
      
      // Add top-level status field for test compatibility
      if (serviceResponse && !serviceResponse.status) {
        serviceResponse.status = serviceResponse.data?.status || 'healthy';
      }
      
      return res.status(200).json(serviceResponse);
    } catch (error) {
      logger.error(`Analysis service health check failed: ${error.message}`);
      
      // Return a standardized error response
      return res.status(503).json({
        success: false,
        status: 'unhealthy',
        error: {
          code: 'ANALYSIS_SERVICE_UNAVAILABLE',
          message: 'Analysis service is currently unavailable',
          details: error.message
        }
      });
    }
  } catch (error) {
    logger.error(`Error in analysis health route: ${error.message}`);
    
    return res.status(500).json({
      success: false,
      status: 'error',
      error: {
        code: 'HEALTH_CHECK_FAILED',
        message: 'Health check failed',
        details: error.message
      }
    });
  }
});

/**
 * @route GET /api/reports/health
 * @desc Report service health check endpoint
 * @access Public
 */
router.get('/reports', async (req, res) => {
  try {
    const reportServiceUrl = getServiceUrl('report-service', '');
    
    // Try to get health status from report service
    let serviceResponse;
    
    try {
      if (axios) {
        const response = await axios.get(`${reportServiceUrl}/api/health`, { timeout: 3000 });
        serviceResponse = response.data;
      } else {
        // Fallback to fetch if axios is not available
        serviceResponse = await getServiceHealth(`${reportServiceUrl}/api`);
      }
      
      // Add top-level status field for test compatibility
      if (serviceResponse && !serviceResponse.status) {
        serviceResponse.status = serviceResponse.data?.status || 'healthy';
      }
      
      return res.status(200).json(serviceResponse);
    } catch (error) {
      logger.error(`Report service health check failed: ${error.message}`);
      
      // Return a standardized error response
      return res.status(503).json({
        success: false,
        status: 'unhealthy',
        error: {
          code: 'REPORT_SERVICE_UNAVAILABLE',
          message: 'Report service is currently unavailable',
          details: error.message
        }
      });
    }
  } catch (error) {
    logger.error(`Error in report health route: ${error.message}`);
    
    return res.status(500).json({
      success: false,
      status: 'error',
      error: {
        code: 'HEALTH_CHECK_FAILED',
        message: 'Health check failed',
        details: error.message
      }
    });
  }
});

/**
 * @route GET /api/health/system
 * @desc Centralized system health monitoring endpoint
 * @access Public
 */
router.get('/system', getSystemHealth);

/**
 * @route GET /api/health/services/:service
 * @desc Get detailed health for a specific service
 * @access Public
 */
router.get('/services/:service', getServiceHealthDetails);

/**
 * @route GET /api/health/metrics/:service/:component
 * @desc Get metrics for a specific service component
 * @access Public
 */
router.get('/metrics/:service/:component', getServiceComponentMetrics);

/**
 * @route POST /api/health/reset-cache
 * @desc Reset health monitoring caches (admin only)
 * @access Private (Admin)
 */
router.post('/reset-cache', verifyToken, requireAdmin, resetCaches);

router.get('/detailed', getHealthStatus);

module.exports = router;
