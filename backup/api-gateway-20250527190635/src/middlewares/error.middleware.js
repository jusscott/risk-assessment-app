/**
 * Error handling middleware for API Gateway
 * Provides standardized error responses across all services
 */

const winston = require('winston');

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
 * Custom error classes for different types of errors
 */
class AppError extends Error {
  constructor(message, code, statusCode) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, details = []) {
    super(message, 'VALIDATION_ERROR', 400);
    this.details = details;
  }
}

class AuthorizationError extends AppError {
  constructor(message) {
    super(message, 'AUTHORIZATION_ERROR', 401);
  }
}

class ForbiddenError extends AppError {
  constructor(message) {
    super(message, 'FORBIDDEN_ERROR', 403);
  }
}

class NotFoundError extends AppError {
  constructor(message) {
    super(message, 'NOT_FOUND_ERROR', 404);
  }
}

class ServiceError extends AppError {
  constructor(message, serviceId) {
    super(message, 'SERVICE_ERROR', 502);
    this.serviceId = serviceId;
  }
}

class InternalError extends AppError {
  constructor(message) {
    super(message, 'INTERNAL_ERROR', 500);
  }
}

/**
 * Error handler for proxied service errors
 * Intercepts proxy errors and converts them to standardized format
 * @param {Error} err - The error object
 * @param {string} serviceName - Name of the service where error occurred
 * @returns {AppError} Standardized error object
 */
const handleProxyError = (err, serviceName) => {
  logger.error(`Proxy error from ${serviceName}: ${err.message}`);
  
  // Handle connection errors to services
  if (err.code === 'ECONNREFUSED') {
    return new ServiceError(`${serviceName} service unavailable`, serviceName);
  }
  
  // Handle timeout errors
  if (err.code === 'ETIMEDOUT') {
    return new ServiceError(`${serviceName} service timed out`, serviceName);
  }
  
  // Handle service response errors (if we can parse their structure)
  if (err.response && err.response.data) {
    const serviceError = err.response.data;
    
    // Try to preserve original error structure if it matches our format
    if (serviceError.error && serviceError.error.code) {
      return new AppError(
        serviceError.error.message || 'Service error',
        serviceError.error.code,
        err.response.status || 500
      );
    }
  }
  
  // Default to generic service error
  return new ServiceError(
    `Error in ${serviceName} service: ${err.message}`, 
    serviceName
  );
};

/**
 * Main error handling middleware
 * Processes all errors and returns standardized responses
 */
const errorHandler = (err, req, res, next) => {
  let error = err;
  
  // Convert to AppError if it's not already one of our error types
  if (!(err instanceof AppError)) {
    error = new InternalError(err.message || 'Internal server error');
  }
  
  // Log error details
  const logContext = {
    statusCode: error.statusCode,
    errorCode: error.code,
    path: req.path,
    method: req.method,
    requestId: req.headers['x-request-id'] || 'unknown',
    userId: req.user ? req.user.id : 'unauthenticated',
    ip: req.ip,
    userAgent: req.headers['user-agent']
  };
  
  if (error.statusCode >= 500) {
    logger.error(`[${error.code}] ${error.message}`, { ...logContext, stack: error.stack });
  } else {
    logger.warn(`[${error.code}] ${error.message}`, logContext);
  }
  
  // Build error response
  const errorResponse = {
    success: false,
    error: {
      code: error.code,
      message: error.message,
    }
  };
  
  // Add details for validation errors
  if (error instanceof ValidationError && error.details) {
    errorResponse.error.details = error.details;
  }
  
  // Add service information for service errors
  if (error instanceof ServiceError) {
    errorResponse.error.service = error.serviceId;
  }
  
  return res.status(error.statusCode).json(errorResponse);
};

/**
 * Not found handler for undefined routes
 */
const notFoundHandler = (req, res, next) => {
  const error = new NotFoundError(`Path not found: ${req.path}`);
  next(error);
};

/**
 * Async handler to catch errors in async functions
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Express middleware function
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  handleProxyError,
  ValidationError,
  AuthorizationError,
  ForbiddenError,
  NotFoundError,
  ServiceError,
  InternalError
};
