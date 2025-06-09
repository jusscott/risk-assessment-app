/**
 * Redis Configuration for API Gateway
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

/**
 * Initialize Redis client with connection options and event handlers
 * @returns {Promise<Object>} Redis client
 */
const initRedisClient = async () => {
  if (redisClient) {
    return redisClient;
  }

  try {
    // Initialize Redis client with connection options
    redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://redis:6379',
      socket: {
        reconnectStrategy: (retries) => {
          logger.info(`Redis reconnection attempt: ${retries}`);
          // Maximum retry delay is 30 seconds
          return Math.min(retries * 1000, 30000);
        }
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
      logger.error('Redis client error', { error: err.message });
    });

    redisClient.on('end', () => {
      redisReady = false;
      logger.info('Redis client disconnected');
    });

    redisClient.on('reconnecting', () => {
      logger.info('Redis client reconnecting');
    });

    // Connect to Redis
    await redisClient.connect();
    logger.info('Redis client configured and connected');
    
    return redisClient;
  } catch (error) {
    logger.error('Failed to initialize Redis client', { error: error.message });
    redisReady = false;
    return null;
  }
};

module.exports = {
  initRedisClient,
  getRedisClient: () => redisClient,
  isRedisReady: () => redisReady
};
