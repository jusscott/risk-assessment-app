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

try {
  // Load Redis configuration
  const redisConfig = require('../config/redis.config');
  
  // Try to load rate-limit-redis module
  const redisStore = require('rate-limit-redis');
  RateLimitRedisStore = redisStore.RateLimitRedisStore;
  
  logger.info('Successfully loaded redis modules');
  
  // Initialize Redis client using our config
  redisConfig.initRedisClient()
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
        sendCommand: (...args) => redisClient.sendCommand(args)
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
const apiLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 250 // Limit each IP to 250 requests per windowMs
});

// Authentication endpoints rate limiter (more restrictive to prevent brute force)
const authLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes (shorter than token expiry)
  max: process.env.NODE_ENV === 'test' ? 1000 : 10, // 10 consecutive failed attempts
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
  createRateLimiter
};
