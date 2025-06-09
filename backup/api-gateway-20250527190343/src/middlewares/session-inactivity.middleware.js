/**
 * Session Inactivity Middleware
 * 
 * This middleware enforces a 15-minute inactivity timeout for all authenticated sessions.
 * It works in conjunction with the frontend activity tracker to ensure users are properly
 * logged out after 15 minutes of inactivity.
 */

const { AuthorizationError, asyncHandler } = require('./error.middleware');
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

// Constants
const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes in milliseconds

/**
 * Check if a path should skip inactivity check
 * 
 * @param {string} path - Request path
 * @returns {boolean} True if path should skip inactivity check
 */
const shouldSkipInactivityCheck = (path) => {
  // Public auth paths (login, register, refresh token, etc.)
  if (path.startsWith('/api/auth/') && 
     (!path.includes('/me') && 
      !path.includes('/logout') && 
      !path.includes('/profile'))) {
    return true;
  }
  
  // Health check path
  if (path === '/health') {
    return true;
  }
  
  // OpenAPI documentation path
  if (path === '/api-docs' || path.startsWith('/api-docs/')) {
    return true;
  }
  
  return false;
};

/**
 * Middleware to check for session inactivity
 */
const checkSessionInactivity = asyncHandler(async (req, res, next) => {
  // Skip inactivity check for public routes
  if (shouldSkipInactivityCheck(req.path)) {
    return next();
  }

  // Skip if auth is being bypassed for testing/development
  if (process.env.BYPASS_AUTH === 'true') {
    return next();
  }
  
  // Check for auth header first
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    // No auth header means this will be caught by the auth middleware
    return next();
  }
  
  // Get the last activity timestamp
  const lastActivityHeader = req.headers['x-last-activity'];
  
  if (!lastActivityHeader) {
    // If the client doesn't send the activity header, we'll treat it as a new session
    // The auth middleware will still validate the token
    logger.info(`No activity timestamp found in request to ${req.path}`);
    return next();
  }
  
  try {
    // Parse the last activity timestamp
    const lastActivity = parseInt(lastActivityHeader, 10);
    const now = Date.now();
    
    // Check if the session is inactive
    if (now - lastActivity > INACTIVITY_TIMEOUT) {
      const inactiveTime = Math.round((now - lastActivity) / 1000 / 60);
      logger.info(`Session inactive for ${inactiveTime} minutes, rejecting request to ${req.path}`);
      
      throw new AuthorizationError('Session expired due to inactivity');
    }
    
    // Session is active, continue
    next();
  } catch (error) {
    if (error instanceof AuthorizationError) {
      throw error;
    } else {
      // Invalid timestamp format
      logger.error(`Invalid activity timestamp format: ${lastActivityHeader}`);
      next();
    }
  }
});

module.exports = {
  checkSessionInactivity
};
