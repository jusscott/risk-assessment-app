/**
 * Logging middleware for API Gateway
 * Provides request/response logging with correlation IDs
 */

const winston = require('winston');
const { v4: uuidv4 } = require('uuid');

// Configure logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
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
 * Add request ID and initialize context for request tracking
 */
const requestContextMiddleware = (req, res, next) => {
  // Generate or use existing request ID
  const requestId = req.headers['x-request-id'] || uuidv4();
  req.requestId = requestId;
  
  // Add request ID to response headers
  res.setHeader('x-request-id', requestId);
  
  // Add request timestamp
  req.requestTimestamp = Date.now();
  
  next();
};

/**
 * Log incoming requests
 */
const requestLogger = (req, res, next) => {
  const requestInfo = {
    requestId: req.requestId,
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    userId: req.user ? req.user.id : 'unauthenticated'
  };
  
  // Log basic request info at info level
  logger.info(`Incoming request: ${req.method} ${req.path}`, requestInfo);
  
  // If debug enabled, log request headers and body 
  if (logger.isLevelEnabled('debug')) {
    logger.debug('Request details', {
      ...requestInfo,
      headers: req.headers,
      query: req.query,
      body: maskSensitiveData(req.body)
    });
  }
  
  next();
};

/**
 * Log response details after request completion
 */
const responseLogger = (req, res, next) => {
  // Store the original end method
  const originalEnd = res.end;
  
  // Override the end method to capture and log response
  res.end = function(chunk, encoding) {
    // Calculate request duration
    const responseTime = Date.now() - req.requestTimestamp;
    
    // Restore the original end method
    res.end = originalEnd;
    
    // Call the original end method
    res.end(chunk, encoding);
    
    // Log response details
    const logData = {
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      userId: req.user ? req.user.id : 'unauthenticated'
    };
    
    // Log at appropriate level based on status code
    if (res.statusCode >= 500) {
      logger.error(`Response: ${res.statusCode} ${req.method} ${req.path}`, logData);
    } else if (res.statusCode >= 400) {
      logger.warn(`Response: ${res.statusCode} ${req.method} ${req.path}`, logData);
    } else {
      logger.info(`Response: ${res.statusCode} ${req.method} ${req.path}`, logData);
    }
  };
  
  next();
};

/**
 * Mask sensitive data in request/response logs
 * @param {Object} data - Data object to mask
 * @returns {Object} Masked data object
 */
const maskSensitiveData = (data) => {
  if (!data) return data;
  
  const sensitiveFields = ['password', 'token', 'secret', 'credit_card', 'creditCard'];
  const maskedData = { ...data };
  
  for (const field of sensitiveFields) {
    if (maskedData[field]) {
      maskedData[field] = '********';
    }
  }
  
  return maskedData;
};

module.exports = {
  requestContextMiddleware,
  requestLogger,
  responseLogger,
  logger
};
