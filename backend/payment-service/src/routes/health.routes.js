/**
 * Health check routes for the payment service
 */

const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const axios = require('axios');
const config = require('../config/config');
const stripeService = require('../services/stripe.service');

/**
 * @route GET /api/health
 * @desc Basic health check endpoint
 * @access Public
 */
router.get('/', async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      data: {
        service: 'payment-service',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.VERSION || '1.0.0'
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: {
        code: 'HEALTH_CHECK_FAILED',
        message: 'Health check failed',
        details: error.message
      }
    });
  }
});

/**
 * @route GET /api/health/deep
 * @desc Deep health check that tests database and dependencies
 * @access Public
 */
router.get('/deep', async (req, res) => {
  const startTime = Date.now();
  try {
    // Check database connection
    let dbStatus = 'healthy';
    let dbError = null;
    let dbResponseTime = 0;
    
    try {
      const dbStartTime = Date.now();
      // Simple query to check database connection
      await prisma.$queryRaw`SELECT 1`;
      dbResponseTime = Date.now() - dbStartTime;
    } catch (error) {
      dbStatus = 'unhealthy';
      dbError = error.message;
    }
    
    // Check connection to Stripe API
    let stripeStatus = 'healthy';
    let stripeError = null;
    let stripeResponseTime = 0;
    
    try {
      const stripeStartTime = Date.now();
      // Perform a simple Stripe API call to verify connectivity
      await stripeService.ping();
      stripeResponseTime = Date.now() - stripeStartTime;
    } catch (error) {
      stripeStatus = 'unhealthy';
      stripeError = error.message;
    }
    
    // Check connection to auth service (for token validation)
    let authServiceStatus = 'healthy';
    let authServiceError = null;
    let authResponseTime = 0;
    
    try {
      const authStartTime = Date.now();
      const response = await axios.get(`${config.services.auth}/health`, {
        timeout: 5000
      });
      authResponseTime = Date.now() - authStartTime;
      
      if (!response.data.success) {
        authServiceStatus = 'degraded';
        authServiceError = 'Service returned unsuccessful response';
      }
    } catch (error) {
      authServiceStatus = 'unhealthy';
      authServiceError = error.message;
    }
    
    // Return overall health
    const isHealthy = dbStatus === 'healthy' && 
                      stripeStatus === 'healthy' && 
                      authServiceStatus === 'healthy';
    
    // Calculate total response time for this health check
    const healthCheckResponseTime = Date.now() - startTime;
    
    return res.status(isHealthy ? 200 : 503).json({
      success: isHealthy,
      data: {
        service: 'payment-service',
        status: isHealthy ? 'healthy' : 'degraded',
        version: process.env.VERSION || '1.0.0',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        responseTime: healthCheckResponseTime,
        details: {
          components: {
            database: {
              status: dbStatus,
              error: dbError,
              responseTime: dbResponseTime
            }
          },
          dependencies: {
            'stripe-api': {
              status: stripeStatus,
              error: stripeError,
              responseTime: stripeResponseTime
            },
            'auth-service': {
              status: authServiceStatus,
              error: authServiceError,
              responseTime: authResponseTime
            }
          },
          memory: {
            rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + 'MB',
            heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB',
            heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB'
          },
          environment: config.env || process.env.NODE_ENV || 'development'
        }
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: {
        code: 'HEALTH_CHECK_FAILED',
        message: 'Health check failed',
        details: error.message
      }
    });
  }
});

module.exports = router;
