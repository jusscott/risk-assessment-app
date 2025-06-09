const express = require('express');
const { check } = require('express-validator');
const router = express.Router();
const invoiceController = require('../controllers/invoice.controller');
const { authenticateJWT, authorizeRoles } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validation.middleware');

// Get all invoices for a user
router.get(
  '/user/:userId',
  authenticateJWT,
  invoiceController.getUserInvoices
);

// Get invoice by ID
router.get(
  '/:id',
  authenticateJWT,
  invoiceController.getInvoiceById
);

// Create a new invoice (admin only)
router.post(
  '/',
  authenticateJWT,
  authorizeRoles(['ADMIN']),
  [
    check('userId').notEmpty().withMessage('User ID is required'),
    check('planId').notEmpty().withMessage('Plan ID is required'),
    check('amount').isNumeric().withMessage('Amount must be a numeric value'),
    check('currency').isLength({ min: 3, max: 3 }).withMessage('Currency must be a 3-letter code')
  ],
  validate,
  invoiceController.createInvoice
);

// Update invoice status (admin only)
router.patch(
  '/:id/status',
  authenticateJWT,
  authorizeRoles(['ADMIN']),
  [
    check('status').isIn(['pending', 'paid', 'failed']).withMessage('Status must be one of: pending, paid, failed')
  ],
  validate,
  invoiceController.updateInvoiceStatus
);

module.exports = router;
