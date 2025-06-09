const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const optimizedAuth = require('../middlewares/optimized-auth.middleware');

const prisma = new PrismaClient();

/**
 * Enhanced diagnostic routes for questionnaire service debugging
 * These endpoints help diagnose the persistent questionnaire loading issues
 */

/**
 * GET /api/diagnostic/database - Test database connectivity
 */
router.get('/database', async (req, res) => {
  try {
    // Test basic database connectivity
    await prisma.$connect();
    
    // Test a simple query
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    
    // Get database info
    const dbUrl = process.env.DATABASE_URL || 'Not configured';
    const dbName = dbUrl.includes('/')
      ? dbUrl.split('/').pop().split('?')[0]
      : 'Unknown';
    
    res.status(200).json({
      success: true,
      data: {
        database: dbName,
        connected: true,
        testQuery: result,
        timestamp: new Date().toISOString()
      },
      message: 'Database connectivity test successful'
    });
  } catch (error) {
    console.error('Database connectivity test failed:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Database connectivity test failed',
        details: error.message
      }
    });
  }
});

/**
 * GET /api/diagnostic/templates-count - Get count of templates in database
 */
router.get('/templates-count', async (req, res) => {
  try {
    const count = await prisma.template.count();
    
    // Also get sample template data for debugging
    const sampleTemplates = await prisma.template.findMany({
      take: 3,
      select: {
        id: true,
        name: true,
        category: true,
        active: true,
        createdAt: true
      }
    });
    
    res.status(200).json({
      success: true,
      data: {
        count,
        sampleTemplates,
        timestamp: new Date().toISOString()
      },
      message: `Found ${count} templates in database`
    });
  } catch (error) {
    console.error('Templates count query failed:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Could not count templates',
        details: error.message
      }
    });
  }
});

/**
 * GET /api/diagnostic/submissions-count - Get count of submissions in database
 */
router.get('/submissions-count', async (req, res) => {
  try {
    const totalCount = await prisma.submission.count();
    
    // Get breakdown by status
    const statusBreakdown = await prisma.submission.groupBy({
      by: ['status'],
      _count: {
        id: true
      }
    });
    
    // Get unique user count
    const uniqueUsers = await prisma.submission.findMany({
      select: {
        userId: true
      },
      distinct: ['userId']
    });
    
    // Sample submissions for debugging
    const sampleSubmissions = await prisma.submission.findMany({
      take: 5,
      select: {
        id: true,
        userId: true,
        status: true,
        templateId: true,
        createdAt: true
      }
    });
    
    res.status(200).json({
      success: true,
      data: {
        count: totalCount,
        statusBreakdown,
        uniqueUserCount: uniqueUsers.length,
        sampleSubmissions,
        timestamp: new Date().toISOString()
      },
      message: `Found ${totalCount} submissions in database`
    });
  } catch (error) {
    console.error('Submissions count query failed:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Could not count submissions',
        details: error.message
      }
    });
  }
});

/**
 * GET /api/diagnostic/user-info - Get current user info as seen by this service
 * Requires authentication
 */
router.get('/user-info', optimizedAuth.authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const userEmail = req.user.email;
    const userRole = req.user.role;
    
    // Get user's submissions for context
    const userSubmissions = await prisma.submission.findMany({
      where: { userId },
      select: {
        id: true,
        status: true,
        templateId: true,
        createdAt: true
      },
      take: 5
    });
    
    res.status(200).json({
      success: true,
      data: {
        userId,
        userEmail,
        userRole,
        userIdType: typeof userId,
        submissionCount: userSubmissions.length,
        sampleSubmissions: userSubmissions,
        timestamp: new Date().toISOString()
      },
      message: `User info for authenticated user`
    });
  } catch (error) {
    console.error('User info query failed:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'USER_INFO_ERROR',
        message: 'Could not retrieve user info',
        details: error.message
      }
    });
  }
});

/**
 * GET /api/diagnostic/system-health - Comprehensive system health check
 */
router.get('/system-health', async (req, res) => {
  try {
    const checks = {
      database: { status: 'unknown', details: null },
      templates: { status: 'unknown', details: null },
      prismaConnection: { status: 'unknown', details: null }
    };
    
    // Test database connection
    try {
      await prisma.$connect();
      const dbTest = await prisma.$queryRaw`SELECT NOW() as current_time`;
      checks.database = {
        status: 'healthy',
        details: { currentTime: dbTest[0]?.current_time }
      };
    } catch (error) {
      checks.database = {
        status: 'unhealthy',
        details: { error: error.message }
      };
    }
    
    // Test templates availability
    try {
      const templateCount = await prisma.template.count();
      const activeTemplates = await prisma.template.count({
        where: { active: true }
      });
      
      checks.templates = {
        status: templateCount > 0 ? 'healthy' : 'warning',
        details: {
          totalTemplates: templateCount,
          activeTemplates,
          needsSeeding: templateCount === 0
        }
      };
    } catch (error) {
      checks.templates = {
        status: 'unhealthy',
        details: { error: error.message }
      };
    }
    
    // Test Prisma connection pool
    try {
      const metrics = await prisma.$metrics.json();
      checks.prismaConnection = {
        status: 'healthy',
        details: { metrics: metrics || 'No metrics available' }
      };
    } catch (error) {
      // Metrics might not be available in all Prisma versions
      checks.prismaConnection = {
        status: 'healthy',
        details: { note: 'Metrics not available but connection working' }
      };
    }
    
    // Determine overall health
    const healthyCount = Object.values(checks).filter(c => c.status === 'healthy').length;
    const totalChecks = Object.keys(checks).length;
    
    const overallStatus = healthyCount === totalChecks ? 'healthy' :
                         healthyCount > 0 ? 'degraded' : 'unhealthy';
    
    res.status(200).json({
      success: true,
      data: {
        overallStatus,
        healthyChecks: healthyCount,
        totalChecks,
        checks,
        environment: {
          nodeEnv: process.env.NODE_ENV,
          port: process.env.PORT,
          databaseUrl: process.env.DATABASE_URL ? 'configured' : 'not configured'
        },
        timestamp: new Date().toISOString()
      },
      message: `System health check completed - Status: ${overallStatus}`
    });
  } catch (error) {
    console.error('System health check failed:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'HEALTH_CHECK_ERROR',
        message: 'System health check failed',
        details: error.message
      }
    });
  }
});

/**
 * GET /api/diagnostic/auth-test - Test authentication flow
 * Requires authentication
 */
router.get('/auth-test', optimizedAuth.authenticate, async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');
    
    res.status(200).json({
      success: true,
      data: {
        authenticated: true,
        user: {
          id: req.user.id,
          email: req.user.email,
          role: req.user.role
        },
        tokenPresent: !!token,
        tokenLength: token?.length || 0,
        authHeaderPresent: !!authHeader,
        timestamp: new Date().toISOString()
      },
      message: 'Authentication test successful'
    });
  } catch (error) {
    console.error('Auth test failed:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'AUTH_TEST_ERROR',
        message: 'Authentication test failed',
        details: error.message
      }
    });
  }
});

/**
 * POST /api/diagnostic/create-test-data - Create test data for diagnostics
 * This is for development/testing only
 */
router.post('/create-test-data', async (req, res) => {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      success: false,
      error: {
        code: 'NOT_ALLOWED',
        message: 'Test data creation not allowed in production'
      }
    });
  }
  
  try {
    const { userId = 'test-user-123', templateId = 1 } = req.body;
    
    // Check if template exists
    const template = await prisma.template.findUnique({
      where: { id: parseInt(templateId) }
    });
    
    if (!template) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'TEMPLATE_NOT_FOUND',
          message: `Template with ID ${templateId} not found`
        }
      });
    }
    
    // Create test submission
    const testSubmission = await prisma.submission.create({
      data: {
        userId: userId,
        templateId: parseInt(templateId),
        status: 'draft'
      }
    });
    
    res.status(201).json({
      success: true,
      data: {
        submission: testSubmission,
        timestamp: new Date().toISOString()
      },
      message: 'Test data created successfully'
    });
  } catch (error) {
    console.error('Test data creation failed:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'TEST_DATA_ERROR',
        message: 'Could not create test data',
        details: error.message
      }
    });
  }
});

/**
 * GET /api/diagnostic/full-diagnostic - Comprehensive diagnostic report
 */
router.get('/full-diagnostic', async (req, res) => {
  try {
    const diagnosticResults = {
      timestamp: new Date().toISOString(),
      service: 'questionnaire-service',
      version: process.env.npm_package_version || 'unknown',
      environment: process.env.NODE_ENV || 'unknown'
    };
    
    // Database connectivity
    try {
      await prisma.$connect();
      const dbInfo = await prisma.$queryRaw`
        SELECT version() as version, current_database() as database, current_user as user
      `;
      diagnosticResults.database = {
        status: 'connected',
        info: dbInfo[0] || {}
      };
    } catch (error) {
      diagnosticResults.database = {
        status: 'failed',
        error: error.message
      };
    }
    
    // Templates data
    try {
      const templateStats = await prisma.template.aggregate({
        _count: { id: true },
        _max: { createdAt: true },
        _min: { createdAt: true }
      });
      
      const activeCount = await prisma.template.count({
        where: { active: true }
      });
      
      diagnosticResults.templates = {
        total: templateStats._count.id,
        active: activeCount,
        oldestTemplate: templateStats._min.createdAt,
        newestTemplate: templateStats._max.createdAt
      };
    } catch (error) {
      diagnosticResults.templates = {
        error: error.message
      };
    }
    
    // Submissions data
    try {
      const submissionStats = await prisma.submission.aggregate({
        _count: { id: true },
        _max: { createdAt: true },
        _min: { createdAt: true }
      });
      
      const statusCounts = await prisma.submission.groupBy({
        by: ['status'],
        _count: { id: true }
      });
      
      diagnosticResults.submissions = {
        total: submissionStats._count.id,
        statusBreakdown: statusCounts,
        oldestSubmission: submissionStats._min.createdAt,
        newestSubmission: submissionStats._max.createdAt
      };
    } catch (error) {
      diagnosticResults.submissions = {
        error: error.message
      };
    }
    
    // Configuration check
    diagnosticResults.configuration = {
      databaseConfigured: !!process.env.DATABASE_URL,
      port: process.env.PORT || 'not set',
      jwtSecret: process.env.JWT_SECRET ? 'configured' : 'not configured',
      authServiceUrl: process.env.AUTH_SERVICE_URL || 'not configured'
    };
    
    res.status(200).json({
      success: true,
      data: diagnosticResults,
      message: 'Full diagnostic completed'
    });
  } catch (error) {
    console.error('Full diagnostic failed:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DIAGNOSTIC_ERROR',
        message: 'Full diagnostic failed',
        details: error.message
      }
    });
  }
});

module.exports = router;
