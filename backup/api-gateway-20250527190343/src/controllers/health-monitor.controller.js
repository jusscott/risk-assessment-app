/**
 * Health Monitoring Controller
 * Provides centralized health monitoring for all microservices
 */

const { 
  getAllServicesHealth, 
  getServiceHealth, 
  getComponentMetrics,
  setHealthCacheTtl,
  clearCaches
} = require('../utils/service-health-monitor');
const { logger } = require('../middlewares/logging.middleware');

// Set a custom cache TTL if needed (default is 10 seconds)
// Adjust based on production needs and load
setHealthCacheTtl(process.env.HEALTH_CACHE_TTL || 10000);

/**
 * Get overall system health
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getSystemHealth(req, res) {
  try {
    // Check if detailed view is requested
    const detailed = req.query.detailed === 'true';
    // Check if we should bypass cache
    const bypassCache = req.query.bypassCache === 'true';
    
    logger.info('Processing system health request', { 
      detailed, 
      bypassCache,
      requestId: req.requestId
    });
    
    // Get health data for all services
    const healthData = await getAllServicesHealth(!bypassCache, detailed);
    
    // Add API Gateway status (which is handling this request)
    healthData.services['api-gateway'] = {
      name: 'api-gateway',
      status: 'healthy', // Since this request is being processed
      timestamp: new Date().toISOString(),
      version: process.env.API_VERSION || '1.0.0'
    };
    
    // Increment the healthy services count
    healthData.servicesHealthy++;
    healthData.servicesTotal++;
    
    // Include request info in response
    healthData.requestInfo = {
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
      detailed,
      bypassCache
    };
    
    return res.status(200).json({
      success: true,
      status: healthData.status,
      data: healthData
    });
  } catch (error) {
    logger.error('Error getting system health:', { 
      error: error.message,
      stack: error.stack,
      requestId: req.requestId
    });
    
    return res.status(500).json({
      success: false,
      status: 'error',
      error: {
        code: 'HEALTH_CHECK_FAILED',
        message: 'Failed to get system health',
        details: error.message
      }
    });
  }
}

/**
 * Get health for a specific service
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getServiceHealthDetails(req, res) {
  try {
    const { service } = req.params;
    const detailed = req.query.detailed === 'true';
    
    if (!service) {
      return res.status(400).json({
        success: false,
        status: 'error',
        error: {
          code: 'INVALID_SERVICE',
          message: 'Service name is required'
        }
      });
    }
    
    logger.info(`Processing health request for service ${service}`, { 
      service, 
      detailed,
      requestId: req.requestId
    });
    
    // Get health data for the specific service
    const serviceHealth = await getServiceHealth(service, detailed);
    
    return res.status(200).json({
      success: true,
      status: serviceHealth.status,
      data: serviceHealth
    });
  } catch (error) {
    logger.error('Error getting service health:', { 
      error: error.message,
      stack: error.stack,
      requestId: req.requestId
    });
    
    return res.status(500).json({
      success: false,
      status: 'error',
      error: {
        code: 'HEALTH_CHECK_FAILED',
        message: 'Failed to get service health',
        details: error.message
      }
    });
  }
}

/**
 * Get metrics for a specific service component
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getServiceComponentMetrics(req, res) {
  try {
    const { service, component } = req.params;
    
    if (!service || !component) {
      return res.status(400).json({
        success: false,
        status: 'error',
        error: {
          code: 'INVALID_PARAMETERS',
          message: 'Service and component names are required'
        }
      });
    }
    
    logger.info(`Processing metrics request for ${service}/${component}`, { 
      service, 
      component,
      requestId: req.requestId
    });
    
    // Get metrics for the specific component
    const metricsResult = await getComponentMetrics(service, component);
    
    if (!metricsResult.success) {
      return res.status(503).json({
        success: false,
        status: 'error',
        error: {
          code: 'METRICS_UNAVAILABLE',
          message: `Failed to get ${component} metrics for ${service}`,
          details: metricsResult.error
        }
      });
    }
    
    return res.status(200).json({
      success: true,
      data: metricsResult.data
    });
  } catch (error) {
    logger.error('Error getting component metrics:', { 
      error: error.message,
      stack: error.stack,
      requestId: req.requestId
    });
    
    return res.status(500).json({
      success: false,
      status: 'error',
      error: {
        code: 'METRICS_CHECK_FAILED',
        message: 'Failed to get component metrics',
        details: error.message
      }
    });
  }
}

/**
 * Reset health monitoring caches
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
function resetCaches(req, res) {
  try {
    logger.info('Resetting health monitoring caches', { 
      requestId: req.requestId
    });
    
    // Clear caches
    clearCaches();
    
    return res.status(200).json({
      success: true,
      message: 'Health monitoring caches reset successfully'
    });
  } catch (error) {
    logger.error('Error resetting caches:', { 
      error: error.message,
      stack: error.stack,
      requestId: req.requestId
    });
    
    return res.status(500).json({
      success: false,
      status: 'error',
      error: {
        code: 'CACHE_RESET_FAILED',
        message: 'Failed to reset caches',
        details: error.message
      }
    });
  }
}

module.exports = {
  getSystemHealth,
  getServiceHealthDetails,
  getServiceComponentMetrics,
  resetCaches
};
