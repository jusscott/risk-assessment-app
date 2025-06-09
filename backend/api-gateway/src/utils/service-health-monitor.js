/**
 * Service Health Monitoring Utility
 * 
 * Provides centralized health monitoring for all microservices
 * in the Risk Assessment application. Collects detailed metrics
 * and integrates with the circuit breaker system.
 */

const axios = require('axios');
const { logger } = require('../middlewares/logging.middleware');
const { getServiceUrl } = require('../config/service-url.config');

// Optional metrics - some services may not provide these
const OPTIONAL_METRICS = [
  'responseTime',
  'memoryUsage',
  'cpuUsage',
  'activeConnections',
  'queueSize',
  'databaseConnections',
  'cacheHitRate'
];

// Cache for health data to avoid excessive requests
let healthCache = {
  timestamp: null,
  data: null,
  ttl: 10000 // Cache TTL in ms (10 seconds)
};

// Circuit breaker status cache
let circuitStatusCache = {
  timestamp: null,
  data: null,
  ttl: 10000 // Cache TTL in ms (10 seconds)
};

/**
 * Get the health status of all services
 * 
 * @param {boolean} useCache - Whether to use cached data if available
 * @param {boolean} includeMetrics - Whether to include detailed metrics
 * @returns {Promise<Object>} - Health status for all services
 */
async function getAllServicesHealth(useCache = true, includeMetrics = true) {
  // Return cached data if requested and available
  if (useCache && 
      healthCache.data && 
      healthCache.timestamp && 
      (Date.now() - healthCache.timestamp) < healthCache.ttl) {
    logger.debug('Returning cached health data');
    return healthCache.data;
  }

  // Services to check
  const services = [
    'auth-service',
    'questionnaire-service',
    'payment-service',
    'analysis-service',
    'report-service'
  ];

  logger.info('Collecting health data from all services');
  
  // Get circuit breaker status
  const circuitStatus = await getCircuitBreakerStatus(useCache);

  // Initialize results
  const result = {
    timestamp: new Date().toISOString(),
    servicesTotal: services.length,
    servicesHealthy: 0,
    servicesDegraded: 0,
    servicesUnhealthy: 0,
    services: {}
  };

  // Check each service in parallel
  const healthChecks = services.map(async (serviceName) => {
    try {
      const serviceHealth = await getServiceHealth(serviceName, includeMetrics);
      
      // Update service count based on status
      if (serviceHealth.status === 'healthy') {
        result.servicesHealthy++;
      } else if (serviceHealth.status === 'degraded') {
        result.servicesDegraded++;
      } else {
        result.servicesUnhealthy++;
      }
      
      // Add circuit breaker status if available
      if (circuitStatus && circuitStatus.circuits && circuitStatus.circuits[serviceName]) {
        serviceHealth.circuitBreaker = {
          isOpen: circuitStatus.circuits[serviceName].stats?.isOpen || false,
          metrics: circuitStatus.circuits[serviceName].stats?.metrics || {}
        };
      }
      
      // Store the service health data
      result.services[serviceName] = serviceHealth;
      
      return serviceHealth;
    } catch (error) {
      logger.error(`Error getting health for ${serviceName}:`, { error: error.message });
      
      // Service is unhealthy if we can't get its status
      result.servicesUnhealthy++;
      
      // Create a minimal health record for the failed service
      const unhealthyService = {
        name: serviceName,
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message
      };
      
      // Add circuit breaker status if available
      if (circuitStatus && circuitStatus.circuits && circuitStatus.circuits[serviceName]) {
        unhealthyService.circuitBreaker = {
          isOpen: circuitStatus.circuits[serviceName].stats?.isOpen || false,
          metrics: circuitStatus.circuits[serviceName].stats?.metrics || {}
        };
      }
      
      // Store the service health data
      result.services[serviceName] = unhealthyService;
      
      return unhealthyService;
    }
  });

  // Wait for all health checks to complete
  await Promise.all(healthChecks);
  
  // Calculate overall system health
  if (result.servicesUnhealthy > 0) {
    result.status = 'unhealthy';
  } else if (result.servicesDegraded > 0) {
    result.status = 'degraded';
  } else {
    result.status = 'healthy';
  }

  // Cache the result
  healthCache = {
    timestamp: Date.now(),
    data: result,
    ttl: healthCache.ttl
  };

  return result;
}

/**
 * Get health status for a single service
 * 
 * @param {string} serviceName - The name of the service
 * @param {boolean} includeMetrics - Whether to include detailed metrics
 * @returns {Promise<Object>} - Service health data
 */
async function getServiceHealth(serviceName, includeMetrics = true) {
  try {
    const serviceUrl = getServiceUrl(serviceName, '');
    const healthUrl = `${serviceUrl}/api/health${includeMetrics ? '/detailed' : ''}`;
    
    logger.debug(`Requesting health from ${healthUrl}`);
    
    const response = await axios.get(healthUrl, { 
      timeout: 5000,
      validateStatus: () => true // Accept any status code
    });
    
    // If the service returned data but it's not in the expected format,
    // transform it to the standard format
    let healthData;
    
    if (response.status >= 200 && response.status < 300 && response.data) {
      if (response.data.success === true && response.data.data) {
        // Standard format, use as is but normalize
        healthData = {
          name: serviceName,
          status: response.data.data.status || 'healthy',
          version: response.data.data.version || 'unknown',
          timestamp: response.data.data.timestamp || new Date().toISOString()
        };
        
        // Add component details if available
        if (response.data.data.details && response.data.data.details.components) {
          healthData.components = response.data.data.details.components;
        }
        
        // Add any additional metrics
        if (includeMetrics && response.data.data.metrics) {
          healthData.metrics = response.data.data.metrics;
        }
      } else {
        // Non-standard format, create a basic record
        healthData = {
          name: serviceName,
          status: 'healthy', // Assume healthy if we got a response
          timestamp: new Date().toISOString(),
          version: 'unknown'
        };
      }
    } else {
      // Service returned an error
      healthData = {
        name: serviceName,
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: `Service returned status ${response.status}`
      };
    }
    
    return healthData;
  } catch (error) {
    logger.error(`Error getting health for ${serviceName}:`, { error: error.message });
    
    return {
      name: serviceName,
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    };
  }
}

/**
 * Get the current circuit breaker status
 * 
 * @param {boolean} useCache - Whether to use cached data if available
 * @returns {Promise<Object>} - Circuit breaker status
 */
async function getCircuitBreakerStatus(useCache = true) {
  // Return cached data if requested and available
  if (useCache && 
      circuitStatusCache.data && 
      circuitStatusCache.timestamp && 
      (Date.now() - circuitStatusCache.timestamp) < circuitStatusCache.ttl) {
    logger.debug('Returning cached circuit breaker status');
    return circuitStatusCache.data;
  }

  try {
    // The API Gateway has a /circuit-status endpoint for internal use
    const response = await axios.get('http://localhost:5000/circuit-status', {
      timeout: 3000
    });
    
    if (response.status === 200 && response.data) {
      // Cache the result
      circuitStatusCache = {
        timestamp: Date.now(),
        data: response.data,
        ttl: circuitStatusCache.ttl
      };
      
      return response.data;
    }
    
    logger.warn('Failed to get circuit breaker status', { 
      status: response.status 
    });
    
    return null;
  } catch (error) {
    logger.error('Error getting circuit breaker status:', { 
      error: error.message 
    });
    
    return null;
  }
}

/**
 * Get detailed metrics for a specific service component
 * 
 * @param {string} serviceName - The service name
 * @param {string} component - The component name (e.g., 'database', 'cache')
 * @returns {Promise<Object>} - Component metrics
 */
async function getComponentMetrics(serviceName, component) {
  try {
    const serviceUrl = getServiceUrl(serviceName, '');
    const metricsUrl = `${serviceUrl}/api/metrics/${component}`;
    
    logger.debug(`Requesting ${component} metrics from ${metricsUrl}`);
    
    const response = await axios.get(metricsUrl, { 
      timeout: 5000,
      validateStatus: () => true // Accept any status code
    });
    
    if (response.status >= 200 && response.status < 300 && response.data) {
      return {
        success: true,
        data: response.data.data || response.data
      };
    }
    
    return {
      success: false,
      error: `Service returned status ${response.status}`
    };
  } catch (error) {
    logger.error(`Error getting ${component} metrics for ${serviceName}:`, { 
      error: error.message 
    });
    
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Set the TTL for the health cache
 * 
 * @param {number} ttlMs - TTL in milliseconds
 */
function setHealthCacheTtl(ttlMs) {
  if (ttlMs > 0) {
    healthCache.ttl = ttlMs;
  }
}

/**
 * Set the TTL for the circuit status cache
 * 
 * @param {number} ttlMs - TTL in milliseconds
 */
function setCircuitStatusCacheTtl(ttlMs) {
  if (ttlMs > 0) {
    circuitStatusCache.ttl = ttlMs;
  }
}

/**
 * Clear all caches
 */
function clearCaches() {
  healthCache.data = null;
  healthCache.timestamp = null;
  
  circuitStatusCache.data = null;
  circuitStatusCache.timestamp = null;
}

module.exports = {
  getAllServicesHealth,
  getServiceHealth,
  getCircuitBreakerStatus,
  getComponentMetrics,
  setHealthCacheTtl,
  setCircuitStatusCacheTtl,
  clearCaches
};
