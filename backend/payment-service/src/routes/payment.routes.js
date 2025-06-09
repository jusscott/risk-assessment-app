const express = require('express');
const { check } = require('express-validator');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const { authenticateJWT, authorizeRoles } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validation.middleware');

// Create a payment intent for one-time payment
router.post(
  '/intent',
  authenticateJWT,
  [
    check('planId').notEmpty().withMessage('Plan ID is required'),
    check('email').isEmail().withMessage('Valid email is required'),
    check('name').notEmpty().withMessage('Name is required'),
    check('userId').notEmpty().withMessage('User ID is required')
  ],
  validate,
  paymentController.createPaymentIntent
);

// Create a subscription
router.post(
  '/subscription',
  authenticateJWT,
  [
    check('planId').notEmpty().withMessage('Plan ID is required'),
    check('email').isEmail().withMessage('Valid email is required'),
    check('name').notEmpty().withMessage('Name is required'),
    check('userId').notEmpty().withMessage('User ID is required')
  ],
  validate,
  paymentController.createSubscription
);

// Cancel subscription
router.delete(
  '/subscription/:id',
  authenticateJWT,
  paymentController.cancelSubscription
);

// Check subscription status
router.get(
  '/subscription/status/:userId',
  authenticateJWT,
  paymentController.checkSubscriptionStatus
);

// Get user subscription
router.get(
  '/subscription/user/:userId',
  authenticateJWT,
  paymentController.getUserSubscription
);

// Handle Stripe webhooks - no authentication for this endpoint (Stripe calls it directly)
router.post('/webhook', express.raw({ type: 'application/json' }), paymentController.handleWebhook);

module.exports = router;
