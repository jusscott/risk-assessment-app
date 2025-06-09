const express = require('express');
const router = express.Router();
const enterpriseController = require('../controllers/enterprise.controller');
const { authenticateJWT } = require('../middlewares/auth.middleware');
const adminMiddleware = require('../middlewares/admin.middleware');

/**
 * Organization Routes
 */
// Create a new organization
router.post('/organizations',
  authenticateJWT,
  adminMiddleware.isAdmin,
  enterpriseController.createOrganization);

// Get organization by ID
router.get('/organizations/:id',
  authenticateJWT,
  enterpriseController.getOrganization);

// Update organization
router.put('/organizations/:id',
  authenticateJWT,
  adminMiddleware.isAdmin,
  enterpriseController.updateOrganization);

/**
 * Department Routes
 */
// Create a department
router.post('/departments',
  authenticateJWT,
  adminMiddleware.isAdmin,
  enterpriseController.createDepartment);

// Get department by ID
router.get('/departments/:id',
  authenticateJWT,
  enterpriseController.getDepartment);

/**
 * Enterprise Plan Routes
 */
// Create an enterprise plan
router.post('/plans',
  authenticateJWT,
  adminMiddleware.isAdmin,
  enterpriseController.createEnterprisePlan);

// Get enterprise plan by ID
router.get('/plans/:id',
  authenticateJWT,
  enterpriseController.getEnterprisePlan);

/**
 * Enterprise Usage Quota Routes
 */
// Create a usage quota for an enterprise plan
router.post('/quotas',
  authenticateJWT,
  adminMiddleware.isAdmin,
  enterpriseController.createUsageQuota);

/**
 * Enterprise Subscription Routes
 */
// Create a subscription for a user to an enterprise plan
router.post('/subscriptions',
  authenticateJWT,
  adminMiddleware.isAdmin,
  enterpriseController.createSubscription);

/**
 * Enterprise Usage Routes
 */
// Record usage for an enterprise user
router.post('/usage',
  authenticateJWT,
  enterpriseController.recordUsage);

/**
 * Enterprise Invoice Routes
 */
// Generate an invoice for an organization
router.post('/invoices', 
  enterpriseController.generateInvoice);

module.exports = router;
