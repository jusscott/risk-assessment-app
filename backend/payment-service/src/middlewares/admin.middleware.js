const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const config = require('../config/config');

/**
 * Middleware to verify if a user has admin privileges
 */
class AdminMiddleware {
  /**
   * Check if the user has admin role
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  async isAdmin(req, res, next) {
    try {
      // For secure internal API calls, check if API key is provided
      const apiKey = req.headers['x-api-key'];
      if (apiKey && apiKey === config.internalApiKey) {
        return next();
      }
      
      // Otherwise, check if user has admin role from the auth token
      if (!req.user || !req.user.id) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Access denied: Not authenticated'
          }
        });
      }
      
      // Check admin status
      // This implementation may vary based on how admin status is stored.
      // Option 1: Check against an admins list in the config
      if (config.adminUsers && config.adminUsers.includes(req.user.id)) {
        return next();
      }
      
      // Option 2: Check admin flag in user's data
      // This would require a call to the auth service or a local cache
      if (req.user.isAdmin) {
        return next();
      }
      
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN', 
          message: 'Access denied: Admin privileges required'
        }
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: error.message
        }
      });
    }
  }
}

module.exports = new AdminMiddleware();
