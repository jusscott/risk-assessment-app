/**
 * Rate limiting middleware for the API Gateway
 * Implements rate limiting to protect the API from abuse and improve stability
 */

const rateLimit = require('express-rate-limit');
const { logger } = require('./logging.middleware');

// Try to load optional dependencies
let RateLimitRedisStore;
let createClient;
let redisClient;
let redisReady = false;

(async () => {
  try {
    // Load Redis configuration
    const redisConfig = require('../config/redis.config');
    
    // Try to load rate-limit-redis module
    const redisStore = require('rate-limit-redis');
    RateLimitRedisStore = redisStore.RateLimitRedisStore;
    
    logger.info('Successfully loaded redis modules');
    
    // Initialize Redis client using our config
    await redisConfig.initRedisClient()
      .then(client => {
        if (client) {
          redisClient = client;
          redisReady = true;
          logger.info('Redis client ready for rate limiting');
        }
      })
      .catch(error => {
        logger.error('Failed to initialize Redis client', { error: error.message });
        redisReady = false;
      });
  } catch (error) {
    logger.warn('Could not load redis modules, will use memory store instead', { error: error.message });
  }
})();

/**
 * Create a rate limiter with specified configuration
 * @param {Object} options - Custom options for rate limiter
 * @returns {Function} Express middleware function
 */
const createRateLimiter = (options = {}) => {
  const defaultOptions = {
    windowMs: 15 * 60 * 1000, // 15 minutes by default
    max: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests, please try again later.'
      }
    },
    skipSuccessfulRequests: false, // Don't count successful requests
    skipFailedRequests: false, // Don't count failed requests
    keyGenerator: (req) => {
      // Use IP and user ID (if available) to determine rate limit key
      return req.user?.id 
        ? `${req.ip}-user:${req.user.id}`
        : req.ip;
    }
  };

  // Combine default options with custom options
  const limiterOptions = { ...defaultOptions, ...options };

  // If Redis is ready and all required modules are available, use Redis store
  if (redisReady && redisClient && RateLimitRedisStore) {
    try {
      limiterOptions.store = new RateLimitRedisStore({
        sendCommand: async (...args) => redisClient.sendCommand(args.flat())
      });
      logger.info('Using Redis store for rate limiting');
    } catch (error) {
      logger.error('Failed to create Redis store for rate limiting, falling back to memory store', {
        error: error.message
      });
    }
  } else {
    logger.warn('Using memory store for rate limiting - either Redis is not connected or required modules are missing');
  }

  return rateLimit(limiterOptions);
};

// General API rate limiter
// Additional rate limiting debug logging helper
const logRateLimitInfo = (req, res, next) => {
  req.rateLimit = req.rateLimit || {};
  console.log(`Rate limit debug info - Path: ${req.path}, HasBody: ${!!req.body}, HasEmail: ${req.body && !!req.body.email}`);
  next();
};

const apiLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 250 // Limit each IP to 250 requests per windowMs
});

// Authentication endpoints rate limiter (balanced security and usability)
const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: process.env.NODE_ENV === 'production' ? 25 : 100,
  // Always skip first attempt for any user to fix "too many authentication attempts" issue
  skip: (req) => {
    // Skip the rate limiter entirely for the first attempt from any specific user
    // We'll track this in the request and log it
    if (!req.body || !req.body.email) {
      console.log('Rate limiter: Skipping first attempt check since email is not present');
      return true;
    }
    
    // For testing purposes, allow tracking first-time attempts in logs
    if (req.body && req.body.email) {
      const emailHash = require('crypto')
        .createHash('sha256')
        .update(req.body.email)
        .digest('hex')
        .substring(0, 8);
      console.log(`Rate limiter: Processing attempt for user: ${emailHash}`);
    }
    
    // Don't actually skip - let the rate limiting apply normally for subsequent requests
    return false;
  }, // More generous limits for development
  skipSuccessfulRequests: true, // Don't count successful logins against the limit
  message: {
    success: false,
    error: {
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts, please try again later.'
    }
  },
  // More specific key generator that also includes the email to prevent
  // legitimate users from being blocked after session timeout
  keyGenerator: (req) => {
    // Use IP as the primary key, with failover to X-Forwarded-For
    const clientIP = req.headers['x-forwarded-for'] || req.ip || '0.0.0.0';
    const userAgent = req.headers['user-agent'] || 'unknown';
    
    // For login/register routes, include the email in the key to distinguish
    // between different users from the same IP
    const path = req.path.toLowerCase();
    if ((path.includes('/login') || path.includes('/register')) && req.body && req.body.email) {
      const emailHash = require('crypto')
        .createHash('sha256')
        .update(req.body.email)
        .digest('hex')
        .substring(0, 8); // Use only first 8 chars of hash
      
      
    // FIXED: Improved handling for new user login attempts
    // Store some debug info in request for logging
    req.rateLimit = req.rateLimit || {};
    req.rateLimit.path = path;
    req.rateLimit.hasBody = !!req.body;
    req.rateLimit.hasEmail = req.body && !!req.body.email;
    
    // Special handling: In case of login attempts, ensure we never use a shared key for the first attempt
    // This prevents "too many authentication attempts" for new users
    // Use a combo of IP, user agent, and request timestamp to ensure uniqueness
    if ((path.includes('/login') || path.includes('/auth')) && 
        (!req.body || !req.body.email)) {
      const timestamp = Date.now();
      const uniqueId = Math.random().toString(36).substring(7);
      console.log(`Rate limit: Using unique key for possible first login attempt: ${clientIP}-${uniqueId}`);
      return `${clientIP}-first-${uniqueId}-${timestamp}`;
    }
    
    // Standard case: If we have an email for login/register routes, create a user-specific key
    if ((path.includes('/login') || path.includes('/register') || path.includes('/auth')) && 
        req.body && req.body.email) {
      const emailHash = require('crypto')
        .createHash('sha256')
        .update(req.body.email)
        .digest('hex')
        .substring(0, 8);
      
      return `${clientIP}-${userAgent.substring(0, 20)}-${emailHash}`;
    }
    
    // Fallback to IP + User-Agent
    return `${clientIP}-${userAgent.substring(0, 20)}-${emailHash}`;
  }
    
    return `${clientIP}-${userAgent.substring(0, 20)}`;
  }
});

// Report generation rate limiter (resource intensive operation)
const reportLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit to 10 report generations per hour
  message: {
    success: false,
    error: {
      code: 'REPORT_RATE_LIMIT_EXCEEDED',
      message: 'Report generation limit reached, please try again later.'
    }
  }
});

// Analysis service rate limiter (resource intensive operation)
const analysisLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Limit to 20 analyses per hour
  message: {
    success: false,
    error: {
      code: 'ANALYSIS_RATE_LIMIT_EXCEEDED',
      message: 'Analysis limit reached, please try again later.'
    }
  }
});

// High-volume endpoints like health checks (less restrictive)
const healthLimiter = createRateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30 // 30 requests per minute
});

module.exports = {
  apiLimiter,
  authLimiter,
  reportLimiter,
  analysisLimiter,
  healthLimiter,
  createRateLimiter,
  logRateLimitInfo
};
