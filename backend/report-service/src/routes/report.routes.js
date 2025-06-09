/**
 * Routes for the report service
 */

const express = require('express');
const { body, param, query } = require('express-validator');
const router = express.Router();
const reportController = require('../controllers/report.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validation.middleware');

// Private routes require authentication - except for download which can be public
router.use((req, res, next) => {
  // Exempt the download route from authentication if it has an access code
  if (req.path.match(/\/\d+\/download/) && req.query.accessCode) {
    return next();
  }
  // Otherwise apply authentication middleware
  return authenticate(req, res, next);
});

/**
 * @route POST /api/reports
 * @desc Create a new report from an analysis
 * @access Private
 */
router.post('/', 
  validate([
    body('analysisId')
      .isInt({ min: 1 })
      .withMessage('Analysis ID must be a positive integer'),
    body('title')
      .optional()
      .isString()
      .isLength({ min: 1, max: 200 })
      .withMessage('Title must be between 1 and 200 characters'),
    body('description')
      .optional()
      .isString()
      .isLength({ max: 1000 })
      .withMessage('Description must be at most 1000 characters'),
    body('isPublic')
      .optional()
      .isBoolean()
      .withMessage('isPublic must be a boolean value'),
    body('expiryDays')
      .optional()
      .isInt({ min: 1, max: 365 })
      .withMessage('Expiry days must be between 1 and 365')
  ]),
  reportController.createReport
);

/**
 * @route GET /api/reports/detail/:id
 * @desc Get detailed report information by ID (for frontend compatibility)
 * @access Private
 */
router.get('/detail/:id',
  validate([
    param('id')
      .isInt({ min: 1 })
      .withMessage('Report ID must be a positive integer')
  ]),
  reportController.getReport
);

/**
 * @route GET /api/reports/:id/download
 * @desc Download a report file (public access with access code)
 * @access Public/Private
 */
router.get('/:id/download',
  validate([
    param('id')
      .isInt({ min: 1 })
      .withMessage('Report ID must be a positive integer'),
    query('accessCode')
      .optional()
      .isString()
      .withMessage('Access code must be a string')
  ]),
  reportController.downloadReport
);

/**
 * @route GET /api/reports/:id
 * @desc Get a specific report by ID
 * @access Private
 */
router.get('/:id',
  validate([
    param('id')
      .isInt({ min: 1 })
      .withMessage('Report ID must be a positive integer')
  ]),
  reportController.getReport
);

/**
 * @route GET /api/reports
 * @desc Get all reports for the current user
 * @access Private
 */
router.get('/', reportController.getUserReports);

/**
 * @route PUT /api/reports/:id/sharing
 * @desc Update report sharing settings
 * @access Private
 */
router.put('/:id/sharing',
  validate([
    param('id')
      .isInt({ min: 1 })
      .withMessage('Report ID must be a positive integer'),
    body('isPublic')
      .optional()
      .isBoolean()
      .withMessage('isPublic must be a boolean value'),
    body('accessCode')
      .optional()
      .isString()
      .isLength({ min: 4, max: 16 })
      .withMessage('Access code must be between 4 and 16 characters'),
    body('expiryDays')
      .optional()
      .isInt({ min: 1, max: 365 })
      .withMessage('Expiry days must be between 1 and 365')
  ]),
  reportController.updateReportSharing
);

/**
 * @route DELETE /api/reports/:id
 * @desc Delete a report
 * @access Private
 */
router.delete('/:id',
  validate([
    param('id')
      .isInt({ min: 1 })
      .withMessage('Report ID must be a positive integer')
  ]),
  reportController.deleteReport
);

module.exports = router;
