/**
 * Security-related routes for API Gateway
 * Provides endpoints for monitoring and managing security features
 * and accessing the centralized health monitoring dashboard
 */

const express = require('express');
const { verifyToken, requireAdmin, getAuthStats } = require('../middlewares/auth.middleware');
const { createRateLimiter } = require('../middlewares/rate-limit.middleware');
const { getSystemHealth } = require('../controllers/health-monitor.controller');

const router = express.Router();

// Apply stricter rate limiting to these endpoints
const securityEndpointLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10 // 10 requests per 5 minutes
});

/**
 * @route GET /api/security/auth-stats
 * @desc Get authentication statistics (admin only)
 * @access Private (Admin)
 */
router.get('/auth-stats', securityEndpointLimiter, verifyToken, requireAdmin, (req, res) => {
  const stats = getAuthStats();
  
  res.status(200).json({
    success: true,
    data: {
      authStats: stats,
      timestamp: new Date().toISOString()
    },
    message: 'Authentication statistics retrieved successfully'
  });
});

/**
 * @route GET /api/security/health-dashboard
 * @desc Get comprehensive health monitoring dashboard (admin only)
 * @access Private (Admin)
 */
router.get('/health-dashboard', securityEndpointLimiter, verifyToken, requireAdmin, async (req, res) => {
  try {
    // Add detailed=true query parameter to get full metrics
    req.query.detailed = 'true';
    
    // Call the system health controller with admin privileges
    await getSystemHealth(req, res);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'HEALTH_DASHBOARD_ERROR',
        message: 'Failed to retrieve health dashboard',
        details: error.message
      }
    });
  }
});

/**
 * @route GET /api/security/circuit-status
 * @desc Get circuit breaker status for all services (admin only)
 * @access Private (Admin)
 */
router.get('/circuit-status', securityEndpointLimiter, verifyToken, requireAdmin, async (req, res) => {
  try {
    // Import service-health-monitor utility
    const { getCircuitBreakerStatus } = require('../utils/service-health-monitor');
    
    // Get circuit breaker status with fresh data (no cache)
    const circuitStatus = await getCircuitBreakerStatus(false);
    
    if (!circuitStatus) {
      return res.status(503).json({
        success: false,
        error: {
          code: 'CIRCUIT_STATUS_UNAVAILABLE',
          message: 'Circuit breaker status is currently unavailable'
        }
      });
    }
    
    res.status(200).json({
      success: true,
      data: circuitStatus,
      message: 'Circuit breaker status retrieved successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'CIRCUIT_STATUS_ERROR',
        message: 'Failed to retrieve circuit breaker status',
        details: error.message
      }
    });
  }
});

module.exports = router;
