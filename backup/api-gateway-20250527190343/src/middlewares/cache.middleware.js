/**
 * Caching middleware for the API Gateway
 * Implements Redis-based caching to improve performance and reduce load on backend services
 */

const { logger } = require('./logging.middleware');

// Initialize Redis connection variables
let createClient;
let expressRedisCache;
let redisClient;
let cache;
let redisReady = false;

// Try to load Redis and express-redis-cache modules
try {
  const redis = require('redis');
  createClient = redis.createClient;
  expressRedisCache = require('express-redis-cache');
  logger.info('Successfully loaded Redis and express-redis-cache modules');
} catch (error) {
  logger.warn('Could not load Redis modules, will use memory cache instead', { error: error.message });
}

// Only initialize Redis if modules are available
if (createClient && expressRedisCache) {
  const initRedisClient = async () => {
    try {
      // Initialize Redis client
      redisClient = createClient({
        url: process.env.REDIS_URL || 'redis://redis:6379',
        socket: {
          reconnectStrategy: (retries) => {
            logger.info(`Redis cache reconnection attempt: ${retries}`);
            // Maximum retry delay is 30 seconds
            return Math.min(retries * 1000, 30000);
          }
        }
      });
  
      // Register event handlers
      redisClient.on('connect', () => {
        logger.info('Redis cache client connecting');
      });
  
      redisClient.on('ready', () => {
        redisReady = true;
        logger.info('Redis cache client connected and ready');
      });
  
      redisClient.on('error', (err) => {
        redisReady = false;
        logger.error('Redis cache client error', { error: err.message });
      });
  
      redisClient.on('end', () => {
        redisReady = false;
        logger.info('Redis cache client disconnected');
      });
  
      redisClient.on('reconnecting', () => {
        logger.info('Redis cache client reconnecting');
      });
  
      // Connect to Redis
      await redisClient.connect();
      
      // Initialize express-redis-cache
      cache = expressRedisCache({
        client: redisClient,
        expire: 60 // Default TTL in seconds
      });
  
      // Listen for cache errors
      cache.on('error', (error) => {
        logger.error('Redis cache error', { error: error.message });
      });
  
      cache.on('message', (message) => {
        logger.debug('Redis cache message', { message });
      });
  
      logger.info('Redis cache configured successfully');
    } catch (error) {
      logger.error('Failed to initialize Redis cache client', { error: error.message });
      redisReady = false;
    }
  };
  
  // Initialize Redis client
  initRedisClient();
} else {
  logger.warn('Redis modules not available, caching will be disabled');
}

/**
 * Create a cache middleware with custom options
 * @param {Object} options - Cache options
 * @param {number} options.ttl - Time to live in seconds
 * @param {string} options.prefix - Cache key prefix
 * @param {Function} options.keyGenerator - Function to generate cache key
 * @returns {Function} Express middleware function or a no-op if Redis is not available
 */
const createCache = (options = {}) => {
  const defaults = {
    ttl: 60, // Default TTL of 60 seconds
    prefix: 'api-cache:', // Default prefix
    keyGenerator: (req) => `${req.originalUrl}` // Default key is the request URL
  };

  const config = { ...defaults, ...options };

  // Return empty middleware if Redis is not available
  if (!redisReady || !cache) {
    logger.warn('Redis cache not available, returning no-op middleware');
    return (req, res, next) => next();
  }

  return (req, res, next) => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Generate cache key
    const cacheKey = `${config.prefix}${config.keyGenerator(req)}`;

    // Use express-redis-cache middleware with dynamic options
    return cache.route({
      name: cacheKey,
      expire: config.ttl,
      // Only cache successful responses
      shouldCache: (req, res) => {
        return res.statusCode >= 200 && res.statusCode < 300;
      }
    })(req, res, next);
  };
};

/**
 * Clears the cache by pattern
 * @param {string} pattern - Pattern to match cache keys (e.g., 'api-cache:*')
 * @returns {Promise<number>} Number of keys removed
 */
const clearCache = async (pattern = 'api-cache:*') => {
  if (!redisReady || !redisClient) {
    logger.warn('Redis cache not available, cannot clear cache');
    return 0;
  }

  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      const result = await redisClient.del(keys);
      logger.info(`Cleared ${result} cache entries matching pattern: ${pattern}`);
      return result;
    }
    return 0;
  } catch (error) {
    logger.error('Error clearing cache', { error: error.message, pattern });
    return 0;
  }
};

// Predefined cache configurations for different endpoints

// Short-lived cache for frequently changing data (30 seconds)
const shortCache = createCache({ ttl: 30 });

// Medium-lived cache for semi-static data (5 minutes)
const mediumCache = createCache({ ttl: 300 });

// Long-lived cache for static data (30 minutes)
const longCache = createCache({ ttl: 1800 });

// Specific cache for questionnaire templates (10 minutes)
const templateCache = createCache({ 
  ttl: 600,
  prefix: 'templates:',
  keyGenerator: (req) => {
    // Include template ID in cache key if available
    const templateId = req.params.id || 'all';
    return `templates:${templateId}`;
  }
});

// Cache for reports list (2 minutes)
const reportsListCache = createCache({
  ttl: 120,
  prefix: 'reports:list:',
  keyGenerator: (req) => {
    // Include user ID in cache key to separate per user
    const userId = req.user?.id || 'anonymous';
    return `reports:list:${userId}`;
  }
});

// Cache for analysis results (5 minutes)
const analysisCache = createCache({
  ttl: 300,
  prefix: 'analysis:',
  keyGenerator: (req) => {
    const analysisId = req.params.id || 'all';
    const userId = req.user?.id || 'anonymous';
    return `analysis:${userId}:${analysisId}`;
  }
});

module.exports = {
  shortCache,
  mediumCache,
  longCache,
  templateCache,
  reportsListCache,
  analysisCache,
  createCache,
  clearCache
};
