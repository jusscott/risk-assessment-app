/**
 * Authentication middleware for API Gateway
 * Validates JWT tokens and adds user information to request
 * Implements advanced security features to prevent brute force attacks
 * Works with session-inactivity middleware to enforce inactivity timeout
 */

const jwt = require('jsonwebtoken');
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

// Track repeated failures per IP to detect potential brute force attacks
const failedAuthAttempts = new Map();
const suspiciousIPs = new Set();

// Configuration for progressive backoff
const AUTH_MAX_CONSECUTIVE_FAILURES = 5; // Number of failures before triggering advanced monitoring
const SUSPICIOUS_THRESHOLD = 10; // Number of failures to mark an IP as suspicious
const CLEANUP_INTERVAL = 30 * 60 * 1000; // Clean up tracking data every 30 minutes

// Clean up the tracking maps periodically
setInterval(() => {
  const now = Date.now();
  // Clean up entries older than 1 hour
  failedAuthAttempts.forEach((data, key) => {
    if (now - data.lastAttempt > 60 * 60 * 1000) {
      failedAuthAttempts.delete(key);
    }
  });
  
  logger.info(`Auth security cleanup: ${failedAuthAttempts.size} IPs being monitored, ${suspiciousIPs.size} suspicious IPs`);
}, CLEANUP_INTERVAL);

/**
 * Track authentication failures to detect brute force attempts
 * @param {Object} req - Express request object
 * @returns {boolean} true if the IP is suspicious and should be closely monitored
 */
const trackAuthFailure = (req) => {
  const clientIP = req.headers['x-forwarded-for'] || req.ip || '0.0.0.0';
  const userAgent = req.headers['user-agent'] || 'unknown';
  const clientId = `${clientIP}-${userAgent.substring(0, 20)}`;
  
  // Initialize or update tracking data
  const now = Date.now();
  const data = failedAuthAttempts.get(clientId) || { 
    count: 0, 
    firstAttempt: now, 
    lastAttempt: now,
    consecutive: 0
  };
  
  // Update tracking data
  data.count++;
  data.consecutive++;
  data.lastAttempt = now;
  failedAuthAttempts.set(clientId, data);
  
  // Check if this client has hit suspicious threshold
  let isSuspicious = false;
  
  if (data.count >= SUSPICIOUS_THRESHOLD) {
    if (!suspiciousIPs.has(clientIP)) {
      suspiciousIPs.add(clientIP);
      logger.warn(`IP ${clientIP} marked as suspicious after ${data.count} failed auth attempts`, {
        clientIP,
        userAgent: userAgent.substring(0, 50),
        failCount: data.count,
        timePeriod: (now - data.firstAttempt) / 1000,
        path: req.path
      });
    }
    isSuspicious = true;
  } else if (data.consecutive >= AUTH_MAX_CONSECUTIVE_FAILURES) {
    logger.info(`Multiple consecutive auth failures from ${clientIP}: ${data.consecutive} attempts`, {
      clientIP,
      userAgent: userAgent.substring(0, 50),
      consecutiveFailures: data.consecutive,
      path: req.path
    });
  }
  
  return isSuspicious;
};

/**
 * Record successful authentication to reset consecutive failure count
 * @param {Object} req - Express request object 
 */
const trackAuthSuccess = (req) => {
  const clientIP = req.headers['x-forwarded-for'] || req.ip || '0.0.0.0';
  const userAgent = req.headers['user-agent'] || 'unknown';
  const clientId = `${clientIP}-${userAgent.substring(0, 20)}`;
  
  // If we were tracking this client, reset consecutive failures
  if (failedAuthAttempts.has(clientId)) {
    const data = failedAuthAttempts.get(clientId);
    data.consecutive = 0;
    failedAuthAttempts.set(clientId, data);
    
    // Log if this was previously a suspicious client
    if (suspiciousIPs.has(clientIP)) {
      logger.info(`Previously suspicious IP ${clientIP} authenticated successfully`, {
        clientIP,
        userAgent: userAgent.substring(0, 50),
        path: req.path
      });
    }
  }
};

/**
 * Middleware to verify JWT token
 * Adds validated user data to request object
 * Tracks authentication patterns to detect brute force attempts
 */
const verifyToken = asyncHandler(async (req, res, next) => {
  // Skip token verification for public routes
  if (shouldSkipAuth(req.path)) {
    return next();
  }

  // Check for BYPASS_AUTH environment variable
  if (process.env.BYPASS_AUTH === 'true') {
    // When auth is bypassed, add a dummy user for services that require a user
    req.user = {
      id: 'bypass-user-id',
      email: 'bypass@example.com',
      role: 'user',
      name: 'Bypass User',
      exp: Math.floor(Date.now() / 1000) + 86400 // 24 hours from now
    };
    
    // Add dummy rate limit data
    req.rateLimit = { 
      ...req.rateLimit,
      userId: req.user.id,
      role: req.user.role
    };
    
    logger.info(`AUTH BYPASSED for path: ${req.path}`, {
      bypassAuth: true,
      path: req.path,
      method: req.method
    });
    
    return next();
  }

  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  // Track this for rate limiting even if no token
  const clientIP = req.headers['x-forwarded-for'] || req.ip || '0.0.0.0';
  
  if (!token) {
    // Don't track missing tokens as failures for most paths
    // Only track for sensitive endpoints that should always have auth
    if (req.path.includes('/me') || req.path.includes('/admin')) {
      trackAuthFailure(req);
    }
    throw new AuthorizationError('No authentication token provided');
  }

  try {
    const jwtSecret = process.env.JWT_SECRET || 'shared-security-risk-assessment-secret-key';
    const decoded = jwt.verify(token, jwtSecret);
    
    // Add user data to request
    req.user = decoded;
    
    // Validate token expiry
    const currentTime = Math.floor(Date.now() / 1000);
    if (decoded.exp && decoded.exp < currentTime) {
      trackAuthFailure(req);
      throw new AuthorizationError('Token has expired');
    }
    
    // Track successful authentication
    trackAuthSuccess(req);
    
    // Enrich req object for rate limiting - this will be used by the rate limiter
    req.rateLimit = { 
      ...req.rateLimit,
      userId: decoded.id,
      role: decoded.role
    };
    
    next();
  } catch (error) {
    // Check for suspicious behavior
    const isSuspicious = trackAuthFailure(req);
    
    // Apply additional delay for suspicious IPs to mitigate brute force
    if (isSuspicious && process.env.NODE_ENV !== 'test') {
      const delay = Math.floor(Math.random() * 2000) + 1000; // 1-3 seconds
      await new Promise(resolve => setTimeout(resolve, delay));
      logger.info(`Added ${delay}ms delay for suspicious IP: ${clientIP}`);
    }
    
    // Handle different JWT error types
    if (error.name === 'JsonWebTokenError') {
      throw new AuthorizationError('Invalid authentication token');
    } else if (error.name === 'TokenExpiredError') {
      throw new AuthorizationError('Authentication token has expired');
    } else if (error instanceof AuthorizationError) {
      throw error;
    } else {
      throw new AuthorizationError('Authentication error');
    }
  }
});

/**
 * Check if a path should skip authentication
 * 
 * @param {string} path - Request path
 * @returns {boolean} True if path should skip auth
 */
const shouldSkipAuth = (path) => {
  // Public auth paths (login, register, etc.)
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
  
  // OpenAPI documentation path (for future implementation)
  if (path === '/api-docs' || path.startsWith('/api-docs/')) {
    return true;
  }
  
  return false;
};

/**
 * Middleware to check for admin role
 * Must be used after verifyToken middleware
 */
const requireAdmin = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    throw new AuthorizationError('Authentication required');
  }
  
  if (req.user.role !== 'admin') {
    throw new AuthorizationError('Admin access required');
  }
  
  next();
});

module.exports = {
  verifyToken,
  requireAdmin,
  // Export these for testing and monitoring
  trackAuthFailure,
  trackAuthSuccess,
  getAuthStats: () => ({
    trackedIPs: failedAuthAttempts.size,
    suspiciousIPs: suspiciousIPs.size,
    thresholds: {
      consecutiveFailures: AUTH_MAX_CONSECUTIVE_FAILURES,
      suspiciousThreshold: SUSPICIOUS_THRESHOLD
    }
  })
};
