import express, { Request, Response } from 'express';
import { prisma } from '../index';
import config from '../config/config';

const router = express.Router();

/**
 * @route GET /health
 * @desc Basic health check endpoint for Docker health checks
 * @access Public
 */
router.get('/health', async (_req: Request, res: Response) => {
  try {
    return res.status(200).json({
      success: true,
      data: {
        service: 'auth-service',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.VERSION || '1.0.0'
      }
    });
  } catch (error: any) {
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
 * @route GET /
 * @desc Basic health check endpoint (root)
 * @access Public
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    return res.status(200).json({
      success: true,
      data: {
        service: 'auth-service',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.VERSION || '1.0.0'
      }
    });
  } catch (error: any) {
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
 * @desc Deep health check that tests database and other dependencies
 * @access Public
 */
router.get('/deep', async (_req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    // Check database connection
    let dbStatus = 'healthy';
    let dbError = null;
    let responseTime = 0;
    
    try {
      const dbStartTime = Date.now();
      // Simple query to check database connection
      await prisma.$queryRaw`SELECT 1`;
      responseTime = Date.now() - dbStartTime;
    } catch (error: any) {
      dbStatus = 'unhealthy';
      dbError = error.message;
    }

    // Check Redis cache connection if applicable
    let cacheStatus = 'not_configured';
    let cacheError = null;
    
    // This is a placeholder - Redis checking would be implemented if Redis is used
    // by the auth service for token blacklisting or rate limiting
    
    // Determine overall health status
    const isHealthy = dbStatus === 'healthy';
    
    // Calculate response time for this health check
    const healthCheckResponseTime = Date.now() - startTime;

    return res.status(isHealthy ? 200 : 503).json({
      success: isHealthy,
      data: {
        service: 'auth-service',
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
              responseTime: responseTime
            },
            cache: {
              status: cacheStatus,
              error: cacheError
            }
          },
          memory: {
            rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + 'MB',
            heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB',
            heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB'
          },
          environment: config.env
        }
      }
    });
  } catch (error: any) {
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

export default router;
