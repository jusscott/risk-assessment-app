/**
 * Automatic report generation routes
 */

const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const generationController = require('../controllers/generation.controller');
const { validate } = require('../middlewares/validation.middleware');

/**
 * @route POST /api/reports/generate
 * @desc Generate a report from a completed analysis
 * @access Private
 */
router.post('/generate',
  validate([
    body('analysisId')
      .isInt({ min: 1 })
      .withMessage('Analysis ID must be a positive integer'),
    body('userId')
      .notEmpty()
      .withMessage('User ID is required')
  ]),
  generationController.generateReport
);

module.exports = router;
