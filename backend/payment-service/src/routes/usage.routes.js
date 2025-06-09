const express = require('express');
const router = express.Router();
const usageController = require('../controllers/usage.controller');
const { authenticateJWT } = require('../middlewares/auth.middleware');
const adminMiddleware = require('../middlewares/admin.middleware');

/**
 * @route POST /api/usage
 * @description Record new usage for a user
 * @access Private
 */
router.post('/', authenticateJWT, usageController.recordUsage);

/**
 * @route GET /api/usage/user/:userId
 * @description Get usage records for a specific user
 * @access Private
 */
router.get('/user/:userId', authenticateJWT, usageController.getUserUsage);

/**
 * @route GET /api/usage/subscription/:subscriptionId
 * @description Get current billing period usage for a subscription
 * @access Private
 */
router.get('/subscription/:subscriptionId', authenticateJWT, usageController.getCurrentUsage);

/**
 * @route POST /api/usage/process-billing
 * @description Process billing for unprocessed usage records (typically called by a scheduled job)
 * @access Private/Admin
 */
router.post('/process-billing', adminMiddleware.isAdmin, usageController.processUsageBilling);

module.exports = router;
