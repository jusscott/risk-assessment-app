#!/usr/bin/env node

/**
 * API Gateway Dependency Fix Script
 * 
 * This script addresses two issues in the API Gateway:
 * 1. Redis connection issues for rate-limiting
 * 2. Missing Axios module
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Paths
const apiGatewayDir = path.join(__dirname, 'backend/api-gateway');
const packageJsonPath = path.join(apiGatewayDir, 'package.json');

console.log('Starting API Gateway dependency fix...');

// Read the current package.json
let packageJson;
try {
  packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  console.log('Successfully read package.json');
} catch (error) {
  console.error('Error reading package.json:', error.message);
  process.exit(1);
}

// Check and add missing dependencies
let dependenciesChanged = false;

// Check for axios
if (!packageJson.dependencies.axios) {
  console.log('Adding axios dependency');
  packageJson.dependencies.axios = '^1.4.0';
  dependenciesChanged = true;
}

// Check Redis dependencies and ensure they're at compatible versions
if (packageJson.dependencies.redis) {
  console.log('Updating Redis dependencies to ensure compatibility');
  packageJson.dependencies.redis = '^4.6.7';
  
  // Make sure rate-limit-redis is at the correct version for Redis v4
  if (packageJson.dependencies['rate-limit-redis']) {
    packageJson.dependencies['rate-limit-redis'] = '^3.0.1';
  }
  
  dependenciesChanged = true;
}

// Write the updated package.json if changes were made
if (dependenciesChanged) {
  try {
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log('Successfully updated package.json');
  } catch (error) {
    console.error('Error writing to package.json:', error.message);
    process.exit(1);
  }

  // Install dependencies
  try {
    console.log('Installing updated dependencies...');
    execSync('cd ' + apiGatewayDir + ' && npm install', { stdio: 'inherit' });
    console.log('Successfully installed dependencies');
  } catch (error) {
    console.error('Error installing dependencies:', error.message);
    process.exit(1);
  }
} else {
  console.log('No package.json changes needed');
}

// Create a Redis configuration file if it doesn't exist
const redisConfigPath = path.join(apiGatewayDir, 'src/config/redis.config.js');
if (!fs.existsSync(redisConfigPath)) {
  console.log('Creating Redis configuration file');
  
  const redisConfigContent = `/**
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
          logger.info(\`Redis reconnection attempt: \${retries}\`);
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
`;

  try {
    fs.writeFileSync(redisConfigPath, redisConfigContent);
    console.log('Successfully created Redis configuration file');
  } catch (error) {
    console.error('Error creating Redis configuration file:', error.message);
  }
}

// Update the rate-limit middleware to use the new Redis config
const rateLimitPath = path.join(apiGatewayDir, 'src/middlewares/rate-limit.middleware.js');
try {
  let rateLimitContent = fs.readFileSync(rateLimitPath, 'utf8');
  
  // Check if we need to update the file
  if (rateLimitContent.includes('const redis = require(\'redis\');')) {
    console.log('Updating rate-limit middleware to use new Redis config');
    
    // Replace the Redis initialization part with our improved version
    const oldRedisCode = `try {
  // Try to load redis module
  const redis = require('redis');
  createClient = redis.createClient;
  
  // Try to load rate-limit-redis module
  const redisStore = require('rate-limit-redis');
  RateLimitRedisStore = redisStore.RateLimitRedisStore;
  
  logger.info('Successfully loaded redis modules');
  
  // Initialize Redis client
  const initRedisClient = async () => {
    try {
      // Initialize Redis client with connection options
      redisClient = createClient({
        url: process.env.REDIS_URL || 'redis://redis:6379',
        socket: {
          reconnectStrategy: (retries) => {
            logger.info(\`Redis reconnection attempt: \${retries}\`);
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
      logger.info('Redis client configured for rate limiting');
    } catch (error) {
      logger.error('Failed to initialize Redis client', { error: error.message });
      redisReady = false;
    }
  };

  // Initialize Redis client
  initRedisClient();`;

    const newRedisCode = `try {
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
    });`;
    
    rateLimitContent = rateLimitContent.replace(oldRedisCode, newRedisCode);
    
    fs.writeFileSync(rateLimitPath, rateLimitContent);
    console.log('Successfully updated rate-limit middleware');
  } else {
    console.log('Rate-limit middleware already updated or in unexpected format');
  }
} catch (error) {
  console.error('Error updating rate-limit middleware:', error.message);
}

// Add a service health check endpoint to the API Gateway
const healthCheckPath = path.join(apiGatewayDir, 'src/controllers/health-check.controller.js');
if (!fs.existsSync(healthCheckPath)) {
  console.log('Creating health check controller');
  
  const healthCheckContent = `/**
 * Health Check Controller
 * Provides detailed health status for the API Gateway and its dependencies
 */

const axios = require('axios');
const { getRedisClient, isRedisReady } = require('../config/redis.config');

/**
 * Get detailed health status of the API Gateway and its dependencies
 */
const getHealthStatus = async (req, res) => {
  try {
    const health = {
      status: 'UP',
      timestamp: new Date().toISOString(),
      dependencies: {
        redis: {
          status: isRedisReady() ? 'UP' : 'DOWN'
        }
      },
      services: {}
    };
    
    // Get service URLs from config
    const serviceUrlConfig = require('../config/service-url.config');
    const serviceUrls = {
      auth: serviceUrlConfig.getServiceUrl('AUTH', 'http://auth-service:5001'),
      questionnaire: serviceUrlConfig.getServiceUrl('QUESTIONNAIRE', 'http://questionnaire-service:5002'),
      payment: serviceUrlConfig.getServiceUrl('PAYMENT', 'http://payment-service:5003/api'),
      analysis: serviceUrlConfig.getServiceUrl('ANALYSIS', 'http://analysis-service:5004/api'),
      report: serviceUrlConfig.getServiceUrl('REPORT', 'http://report-service:5005/api')
    };
    
    // Check each service health
    const serviceChecks = Object.entries(serviceUrls).map(async ([name, url]) => {
      try {
        // Add /health to base URL
        const healthUrl = url.endsWith('/') ? url + 'health' : url + '/health';
        const response = await axios.get(healthUrl, { timeout: 2000 });
        health.services[name] = {
          status: 'UP',
          url: healthUrl
        };
      } catch (error) {
        health.services[name] = {
          status: 'DOWN',
          url: url,
          error: error.message
        };
        // If any service is down, mark overall status as degraded
        health.status = 'DEGRADED';
      }
    });
    
    // Wait for all service checks to complete
    await Promise.all(serviceChecks);
    
    // Return health status
    res.json(health);
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
};

module.exports = {
  getHealthStatus
};
`;

  try {
    fs.writeFileSync(healthCheckPath, healthCheckContent);
    console.log('Successfully created health check controller');
  } catch (error) {
    console.error('Error creating health check controller:', error.message);
  }
}

// Add route for the new health check endpoint
const healthRoutesPath = path.join(apiGatewayDir, 'src/routes/health.routes.js');
try {
  let healthRoutesContent = fs.readFileSync(healthRoutesPath, 'utf8');
  
  if (!healthRoutesContent.includes('health-check.controller')) {
    console.log('Updating health routes to include new health check endpoint');
    
    // Add the new controller import
    let updatedContent = healthRoutesContent.replace(
      'const express = require(\'express\');',
      'const express = require(\'express\');\nconst { getHealthStatus } = require(\'../controllers/health-check.controller\');'
    );
    
    // Add the new route
    updatedContent = updatedContent.replace(
      'module.exports = router;',
      'router.get(\'/detailed\', getHealthStatus);\n\nmodule.exports = router;'
    );
    
    fs.writeFileSync(healthRoutesPath, updatedContent);
    console.log('Successfully updated health routes');
  } else {
    console.log('Health routes already include health check endpoint');
  }
} catch (error) {
  console.error('Error updating health routes:', error.message);
}

console.log('API Gateway dependency fix completed');

// Return a success code
process.exit(0);
