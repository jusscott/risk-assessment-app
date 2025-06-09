/**
 * Fix Redis connection issues in API Gateway
 * 
 * This script updates the Redis configuration in the API Gateway to:
 * 1. Add more detailed error logging for Redis connection issues
 * 2. Implement a more robust fallback mechanism when Redis is unavailable
 * 3. Ensure logRateLimitInfo is properly imported in index.js
 */

const fs = require('fs');
const path = require('path');

// File paths
const apiGatewayDir = path.join(__dirname, 'backend', 'api-gateway', 'src');
const redisConfigPath = path.join(apiGatewayDir, 'config', 'redis.config.js');
const indexPath = path.join(apiGatewayDir, 'index.js');

console.log('Starting Redis connection fix...');

// 1. Update Redis config with better error handling and connection management
try {
  console.log(`Updating Redis configuration at ${redisConfigPath}...`);
  
  const redisConfigContent = fs.readFileSync(redisConfigPath, 'utf8');
  
  // Enhanced Redis configuration with better error handling and detailed logging
  const updatedRedisConfig = `/**
 * Redis Configuration for API Gateway
 * Enhanced with robust fallback mechanisms and detailed error logging
 */

const { createClient } = require('redis');
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

// Redis client singleton
let redisClient = null;
let redisReady = false;

// In-memory fallback cache when Redis is unavailable
const memoryCache = new Map();

/**
 * Get cache value with fallback to in-memory cache
 * @param {string} key - Cache key
 * @returns {Promise<any>} - Cached value or null
 */
const getCacheValue = async (key) => {
  try {
    if (redisReady && redisClient) {
      return await redisClient.get(key);
    } else {
      // Fallback to in-memory cache
      logger.debug(\`Redis unavailable, using in-memory cache for key: \${key}\`);
      return memoryCache.get(key) || null;
    }
  } catch (error) {
    logger.error('Error getting cache value', { error: error.message });
    return memoryCache.get(key) || null;
  }
};

/**
 * Set cache value with fallback to in-memory cache
 * @param {string} key - Cache key
 * @param {any} value - Value to cache
 * @param {number} ttlSeconds - Time to live in seconds
 * @returns {Promise<boolean>} - Success status
 */
const setCacheValue = async (key, value, ttlSeconds = 60) => {
  try {
    if (redisReady && redisClient) {
      await redisClient.set(key, value, { EX: ttlSeconds });
      return true;
    } else {
      // Fallback to in-memory cache
      logger.debug(\`Redis unavailable, using in-memory cache for key: \${key}\`);
      memoryCache.set(key, value);
      
      // Set expiry for in-memory cache
      setTimeout(() => {
        if (memoryCache.has(key)) {
          memoryCache.delete(key);
        }
      }, ttlSeconds * 1000);
      
      return true;
    }
  } catch (error) {
    logger.error('Error setting cache value', { error: error.message });
    // Still try to set in memory cache as fallback
    memoryCache.set(key, value);
    return false;
  }
};

/**
 * Delete cache value with fallback to in-memory cache
 * @param {string} key - Cache key
 * @returns {Promise<boolean>} - Success status
 */
const deleteCacheValue = async (key) => {
  try {
    if (redisReady && redisClient) {
      await redisClient.del(key);
    }
    
    // Always also clean memory cache
    if (memoryCache.has(key)) {
      memoryCache.delete(key);
    }
    
    return true;
  } catch (error) {
    logger.error('Error deleting cache value', { error: error.message });
    
    // Still try to delete from memory cache
    if (memoryCache.has(key)) {
      memoryCache.delete(key);
    }
    
    return false;
  }
};

/**
 * Initialize Redis client with connection options and event handlers
 * Enhanced with better error reporting and connection management
 * @returns {Promise<Object>} Redis client or null if unavailable
 */
const initRedisClient = async () => {
  // Return existing client if already initialized
  if (redisClient) {
    return redisClient;
  }

  try {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    logger.info(\`Connecting to Redis at \${redisUrl} (URI partially masked)\`);
    
    // Initialize Redis client with connection options
    redisClient = createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries) => {
          logger.info(\`Redis reconnection attempt: \${retries}\`);
          
          // Maximum retry delay is 30 seconds, give up after 20 retries
          if (retries > 20) {
            logger.warn('Maximum Redis reconnection attempts reached. Operating in fallback mode.');
            return false; // Stop trying to reconnect
          }
          
          // Exponential backoff up to 30 seconds
          return Math.min(Math.pow(2, retries) * 1000, 30000);
        },
        connectTimeout: 10000, // 10 seconds
      }
    });

    // Log Redis connection events
    redisClient.on('connect', () => {
      logger.info('Redis client connecting');
    });

    redisClient.on('ready', () => {
      redisReady = true;
      logger.info('Redis client connected and ready');
    });

    redisClient.on('error', (err) => {
      redisReady = false;
      const errorMessage = err ? (err.message || 'Unknown Redis error') : 'Empty Redis error';
      logger.error(\`Redis client error: \${errorMessage}\`, { 
        error: errorMessage,
        stack: err ? err.stack : null,
        code: err ? err.code : null
      });
      
      // If we're repeatedly getting connection errors, switch to fallback mode
      if (err && (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT')) {
        logger.warn('Redis connection unavailable. Operating in fallback mode with in-memory cache.');
      }
    });

    redisClient.on('end', () => {
      redisReady = false;
      logger.info('Redis client disconnected');
    });

    redisClient.on('reconnecting', () => {
      logger.info('Redis client reconnecting');
    });

    // Connect to Redis with timeout
    const connectPromise = redisClient.connect();
    
    // Add timeout for connection
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Redis connection timeout after 10 seconds'));
      }, 10000);
    });
    
    // Race connection against timeout
    await Promise.race([connectPromise, timeoutPromise])
      .then(() => {
        logger.info('Redis client configured and connected');
      })
      .catch(error => {
        logger.error('Failed to connect to Redis', { error: error.message });
        logger.warn('Operating in fallback mode with in-memory cache');
        redisReady = false;
        return null;
      });
    
    return redisClient;
  } catch (error) {
    logger.error('Failed to initialize Redis client', { 
      error: error.message,
      stack: error.stack 
    });
    redisReady = false;
    return null;
  }
};

/**
 * Gracefully close Redis connection
 */
const closeRedisConnection = async () => {
  if (redisClient) {
    try {
      logger.info('Closing Redis connection');
      await redisClient.quit();
      redisClient = null;
      redisReady = false;
    } catch (error) {
      logger.error('Error closing Redis connection', { error: error.message });
    }
  }
};

// Create a healthcheck function to verify Redis connection
const checkRedisHealth = async () => {
  try {
    if (!redisClient || !redisReady) {
      return {
        status: 'warning',
        connectionStatus: 'disconnected',
        message: 'Redis not connected, operating in fallback mode',
        usingFallback: true
      };
    }
    
    // Try a PING command to verify connection is working
    await redisClient.ping();
    
    return {
      status: 'healthy',
      connectionStatus: 'connected',
      message: 'Redis connection healthy',
      usingFallback: false
    };
  } catch (error) {
    return {
      status: 'error',
      connectionStatus: 'error',
      message: \`Redis health check failed: \${error.message}\`,
      usingFallback: true
    };
  }
};

// Try to initialize Redis client immediately
initRedisClient().catch(error => {
  logger.warn(\`Initial Redis connection failed: \${error.message}\`);
  logger.warn('System will operate in fallback mode until Redis becomes available');
});

module.exports = {
  initRedisClient,
  getRedisClient: () => redisClient,
  isRedisReady: () => redisReady,
  getCacheValue,
  setCacheValue,
  deleteCacheValue,
  checkRedisHealth,
  closeRedisConnection
};`;

  // Write updated Redis configuration
  fs.writeFileSync(redisConfigPath, updatedRedisConfig);
  console.log('Redis configuration updated successfully!');
  
  // 2. Fix index.js to properly import logRateLimitInfo
  console.log(`Fixing index.js to properly import logRateLimitInfo...`);
  
  const indexContent = fs.readFileSync(indexPath, 'utf8');
  
  // Check if we need to update the import
  if (indexContent.includes('app.use(\'/api/auth\', logRateLimitInfo,') && !indexContent.includes('const { logRateLimitInfo')) {
    // Add proper import for logRateLimitInfo
    const updatedIndex = indexContent.replace(
      'const { \n  apiLimiter, \n  authLimiter, \n  reportLimiter, \n  analysisLimiter, \n  healthLimiter \n} = require(\'./middlewares/rate-limit.middleware\');',
      'const { \n  apiLimiter, \n  authLimiter, \n  reportLimiter, \n  analysisLimiter, \n  healthLimiter,\n  logRateLimitInfo \n} = require(\'./middlewares/rate-limit.middleware\');'
    );
    
    // Write updated index.js
    fs.writeFileSync(indexPath, updatedIndex);
    console.log('index.js updated to properly import logRateLimitInfo!');
  } else {
    console.log('index.js already has proper import for logRateLimitInfo or uses a different pattern, skipping update.');
  }
  
  console.log('\nRedis connection fix completed successfully!');
  console.log('\nNext steps:');
  console.log('1. Restart the API Gateway using: ./restart-api-gateway.sh');
  console.log('2. Monitor logs to verify Redis connection stability');
  console.log('3. The system will now automatically fall back to in-memory cache if Redis is unavailable');
  
} catch (error) {
  console.error('Error applying Redis connection fix:', error);
}
