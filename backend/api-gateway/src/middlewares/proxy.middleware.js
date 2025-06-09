/**
 * Enhanced proxy middleware for API Gateway
 * Wraps http-proxy-middleware with error handling and logging
 */

const { createProxyMiddleware } = require('http-proxy-middleware');
const pathRewriteConfig = require('../config/path-rewrite.config');
const { handleProxyError, ServiceError } = require('./error.middleware');
const winston = require('winston');
const pathConfig = require('../config/path-rewrite.config');
const serviceConfig = require('../config/service-url.config');

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

/**
 * Create an enhanced proxy middleware with error handling integration
 * 
 * @param {Object} options - Proxy options
 * @param {string} options.serviceName - Name of the service for error reporting
 * @param {string} options.serviceUrl - URL of the service to proxy to
 * @param {Object|string} options.pathRewrite - Path rewrite rules or service identifier to use standardized rules
 * @param {number} options.timeout - Timeout in milliseconds (default: 10000)
 * @param {number} options.retries - Number of retry attempts (default: 1)
 * @param {number} options.retryDelay - Delay between retries in milliseconds (default: 1000)
 * @returns {Function} Express middleware function
 */
const createServiceProxy = (options) => {
  const {
    serviceName,
    serviceUrl,
    pathRewrite: pathRewriteOption,
    timeout = 10000,
    retries = 1,
    retryDelay = 1000
  } = options;
  
  // Determine path rewrite rules based on input
  let pathRewrite = {};
  
  if (typeof pathRewriteOption === 'string') {
    // If a string is provided, use it as a service identifier to get standardized rules
    try {
      const serviceId = pathRewriteOption.toLowerCase();
      pathRewrite = pathConfig.generatePathRewrite(serviceId);
      logger.info(`Using standardized path rewrite rules for ${serviceId}`, { rules: Object.keys(pathRewrite) });
    } catch (error) {
      logger.warn(`Failed to use standardized path rewrite for "${pathRewriteOption}": ${error.message}. Using default empty rules.`);
    }
  } else if (typeof pathRewriteOption === 'object') {
    // If an object is provided, use it directly
    pathRewrite = pathRewriteOption || {};
  }

  // Log the proxy setup
  logger.info(`Setting up proxy for ${serviceName} at ${serviceUrl} with timeout ${timeout}ms and ${retries} retry attempts`);

  // Create base proxy middleware
  const proxy = createProxyMiddleware({
    target: serviceUrl,
    changeOrigin: true,
    pathRewrite,
    logLevel: 'silent', // We'll handle our own logging
    timeout,
    proxyTimeout: timeout,
    // Configure with proper body handling for POST requests
    bodyParser: false,
    onError: (err, req, res, target) => {
      // Get current retry count from request object
      req.retryCount = req.retryCount || 0;
      
      // Check if we should retry
      if (req.retryCount < retries) {
        req.retryCount++;
        
        logger.warn(`Retrying request to ${serviceName} (attempt ${req.retryCount}/${retries}): ${req.method} ${req.path}`, {
          error: err.message,
          path: req.path,
          method: req.method,
          requestId: req.headers['x-request-id'] || 'unknown',
          target,
          errorCode: err.code
        });
        
        // Retry after delay
        setTimeout(() => {
          try {
            proxy(req, res);
          } catch (retryErr) {
            // If retry fails, handle as normal error
            handleProxyError(retryErr, serviceName);
          }
        }, retryDelay);
        
        return;
      }
      
      // Convert proxy errors to our standard format after all retries exhausted
      const error = handleProxyError(err, serviceName);
      
      // Log the error
      logger.error(`Proxy error for ${serviceName} after ${retries} retries: ${err.message}`, {
        path: req.path,
        method: req.method,
        requestId: req.headers['x-request-id'] || 'unknown',
        userId: req.user ? req.user.id : 'unauthenticated',
        target,
        errorCode: err.code
      });
      
      // Enhanced error messages for specific service connection issues
      let errorMessage = error.message;
      
      if (serviceName === 'auth-service' && (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND')) {
        errorMessage = 'Authentication service is currently unavailable. Please try again in a few moments.';
        // Additional logging for DNS resolution issues
        if (err.code === 'ENOTFOUND') {
          logger.error(`DNS resolution failed for ${serviceName}. Host ${err.hostname} could not be resolved.`, {
            serviceName,
            hostname: err.hostname,
            requestId: req.headers['x-request-id'] || 'unknown'
          });
        }
      } else if (err.code === 'ENOTFOUND') {
        errorMessage = `Service ${serviceName} could not be reached. DNS resolution failed for ${err.hostname}.`;
        logger.error(`DNS resolution failed for ${serviceName}. Host ${err.hostname} could not be resolved.`, {
          serviceName,
          hostname: err.hostname,
          requestId: req.headers['x-request-id'] || 'unknown'
        });
      }
      
      // Send standardized response
      res.status(error.statusCode).json({
        success: false,
        error: {
          code: error.code,
          message: errorMessage,
          service: error.serviceId
        }
      });
    },
        onProxyReq: (proxyReq, req, res) => {
      // Add request tracking headers
      const requestId = req.headers['x-request-id'] || `req-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
      proxyReq.setHeader('x-request-id', requestId);
      
      // CRITICAL FIX: Explicitly handle Authorization header forwarding with enhanced debugging
      const authHeader = req.headers.authorization || req.get('Authorization') || req.get('authorization');
      if (authHeader) {
        // Force set the authorization header with multiple approaches
        proxyReq.setHeader('Authorization', authHeader);
        proxyReq.setHeader('authorization', authHeader); // Lowercase version as backup
        
        // Extract token for logging (just the first part to avoid logging full tokens)
        const token = authHeader.split(' ')[1] || '';
        const tokenPrefix = token.substring(0, 10) + '...';
        
        logger.debug(`🔐 EXPLICITLY forwarding authorization header to ${serviceName}`, { 
          requestId, 
          service: serviceName,
          tokenPrefix,
          headerPresent: true,
          originalPath: req.originalUrl,
          method: req.method
        });
        
        // Additional debug for submission endpoints
        if (req.originalUrl.includes('/submissions/')) {
          logger.info(`🎯 SUBMISSION REQUEST - Authorization header forwarded to ${serviceName}`, {
            requestId,
            path: req.originalUrl,
            method: req.method,
            tokenPrefix,
            allHeaders: Object.keys(req.headers)
          });
        }
      } else {
        logger.warn(`❌ NO authorization header found for ${serviceName}`, { 
          requestId, 
          service: serviceName,
          originalPath: req.originalUrl,
          method: req.method,
          availableHeaders: Object.keys(req.headers),
          hasUser: !!req.user
        });
        
        // For submission endpoints, this is critical
        if (req.originalUrl.includes('/submissions/')) {
          logger.error(`🚨 CRITICAL: Submission request missing authorization header!`, {
            requestId,
            path: req.originalUrl,
            method: req.method,
            hasUser: !!req.user,
            userHeaders: {
              'x-user-id': req.user ? req.user.id : 'none',
              'x-user-role': req.user ? req.user.role : 'none'
            }
          });
        }
      }
      
      // Add user context if available
      if (req.user) {
        proxyReq.setHeader('x-user-id', req.user.id);
        proxyReq.setHeader('x-user-role', req.user.role);
        
        // Track original session across service boundaries
        if (req.sessionID) {
          proxyReq.setHeader('x-session-id', req.sessionID);
        }
        
        // Special handling for auth service endpoints that need req.user
        // This will help with /me endpoint and others that expect req.user
        if (serviceName === 'auth-service' && (req.path.includes('/me') || req.path === '/')) {
          // Pass the complete user object as a special header
          proxyReq.setHeader('x-auth-user-data', JSON.stringify(req.user));
        }
      }
      
      // Support service-to-service communication with token propagation
      // This helps maintain the user's session context across service boundaries
      if (req.headers['x-service-name']) {
        proxyReq.setHeader('x-service-name', req.headers['x-service-name']);
        logger.debug(`Service-to-service request from ${req.headers['x-service-name']} to ${serviceName}`, {
          requestId,
          fromService: req.headers['x-service-name'],
          toService: serviceName
        });
      } else {
        // Mark this request as originating from the API gateway
        proxyReq.setHeader('x-service-name', 'api-gateway');
      }
      
      // Ensure request body is correctly passed to the proxied request
      if (req.body && Object.keys(req.body).length > 0) {
        const bodyData = JSON.stringify(req.body);
        // Update headers
        proxyReq.setHeader('Content-Type', 'application/json');
        proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
        // Write body to request
        proxyReq.write(bodyData);
      }
      
      // Log the request with enhanced debugging
      logger.debug(`Proxying request to ${serviceName}: ${req.method} ${req.path}`, {
        requestId,
        userId: req.user ? req.user.id : 'unauthenticated',
        service: serviceName,
        hasAuthHeader: !!authHeader,
        isSubmissionRequest: req.originalUrl.includes('/submissions/')
      });
    },
    onProxyRes: (proxyRes, req, res) => {
      const statusCode = proxyRes.statusCode;
      const requestId = req.headers['x-request-id'] || 'unknown';
      
      // Mark successful auth endpoints for rate limiting purposes
      if (serviceName === 'auth-service' && statusCode < 400) {
        // For auth endpoints like login and register, mark as success for rate limiter
        // This works with skipSuccessfulRequests in the rate limiter
        if (req.path.includes('/login') || req.path.includes('/register')) {
          req.rateLimit = { ...req.rateLimit, success: true };
          logger.debug(`Marked auth request as successful for rate limiting: ${req.method} ${req.path}`, {
            requestId,
            service: serviceName
          });
        }
      }
      
      // Log detailed info for non-success responses
      if (statusCode >= 400) {
        logger.warn(`Service ${serviceName} responded with status ${statusCode}: ${req.method} ${req.path}`, {
          requestId,
          userId: req.user ? req.user.id : 'unauthenticated',
          service: serviceName,
          statusCode
        });
      } else {
        // Debug level for successful responses
        logger.debug(`Service ${serviceName} responded with status ${statusCode}: ${req.method} ${req.path}`, {
          requestId,
          service: serviceName,
          statusCode
        });
      }
    }
  });

  // Return the enhanced proxy middleware
  return (req, res, next) => {
    // Check if service is enabled
    try {
      // Clone the request body to prevent issues with body parsing
      if (req.body && Object.keys(req.body).length > 0) {
        req.bodyClone = JSON.parse(JSON.stringify(req.body));
      }
      
      return proxy(req, res, next);
    } catch (error) {
      // Handle any unexpected errors in the proxy itself
      const serviceError = new ServiceError(
        `Error in ${serviceName} proxy configuration: ${error.message}`,
        serviceName
      );
      
      next(serviceError);
    }
  };
};

module.exports = {
  createServiceProxy
};
