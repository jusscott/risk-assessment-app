/**
 * Health check routes for the analysis service
 */

const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const axios = require('axios');
const config = require('../config/config');

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
        service: 'analysis-service',
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
    
    // Check connection to questionnaire service (for fetching submissions)
    let questionnaireServiceStatus = 'healthy';
    let questionnaireServiceError = null;
    let questionnaireResponseTime = 0;
    
    try {
      const qStartTime = Date.now();
      const response = await axios.get(`${config.services.questionnaire}/api/health`, {
        timeout: 5000
      });
      questionnaireResponseTime = Date.now() - qStartTime;
      
      if (!response.data.success) {
        questionnaireServiceStatus = 'degraded';
        questionnaireServiceError = 'Service returned unsuccessful response';
      }
    } catch (error) {
      questionnaireServiceStatus = 'unhealthy';
      questionnaireServiceError = error.message;
    }
    
    // Return overall health
    const isHealthy = dbStatus === 'healthy' && questionnaireServiceStatus === 'healthy';
    
    // Calculate total response time for this health check
    const healthCheckResponseTime = Date.now() - startTime;
    
    return res.status(isHealthy ? 200 : 503).json({
      success: isHealthy,
      data: {
        service: 'analysis-service',
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
            'questionnaire-service': {
              status: questionnaireServiceStatus,
              error: questionnaireServiceError,
              responseTime: questionnaireResponseTime
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
