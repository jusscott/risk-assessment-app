const express = require('express');
const { check } = require('express-validator');
const router = express.Router();
const planController = require('../controllers/plan.controller');
const { authenticateJWT, authorizeRoles } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validation.middleware');

// Get all plans - accessible without authentication
router.get('/', planController.getAllPlans);

// Get plan by ID - accessible without authentication
router.get('/:id', planController.getPlanById);

// Create plan - requires admin role
router.post(
  '/',
  authenticateJWT,
  authorizeRoles(['ADMIN']),
  [
    check('name').notEmpty().withMessage('Plan name is required'),
    check('price').isNumeric().withMessage('Price must be a numeric value'),
    check('currency').isLength({ min: 3, max: 3 }).withMessage('Currency must be a 3-letter code'),
    check('features').isArray().withMessage('Features must be an array')
  ],
  validate,
  planController.createPlan
);

// Update plan - requires admin role
router.put(
  '/:id',
  authenticateJWT,
  authorizeRoles(['ADMIN']),
  [
    check('name').optional(),
    check('description').optional(),
    check('price').optional().isNumeric().withMessage('Price must be a numeric value'),
    check('currency').optional().isLength({ min: 3, max: 3 }).withMessage('Currency must be a 3-letter code'),
    check('features').optional().isArray().withMessage('Features must be an array')
  ],
  validate,
  planController.updatePlan
);

// Delete plan - requires admin role
router.delete(
  '/:id',
  authenticateJWT,
  authorizeRoles(['ADMIN']),
  planController.deletePlan
);

module.exports = router;
