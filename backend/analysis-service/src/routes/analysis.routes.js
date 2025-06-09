/**
 * Routes for the analysis service
 */

const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();
const analysisController = require('../controllers/analysis.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validation.middleware');

// Apply authentication middleware to all routes
router.use(authenticate);

/**
 * @route POST /api/analysis
 * @desc Create a new analysis from a questionnaire submission
 * @access Private
 */
router.post('/', 
  validate([
    body('submissionId')
      .isInt({ min: 1 })
      .withMessage('Submission ID must be a positive integer')
  ]),
  analysisController.createAnalysis
);

/**
 * @route GET /api/analysis/:id
 * @desc Get a specific analysis by ID
 * @access Private
 */
router.get('/:id',
  validate([
    param('id')
      .isInt({ min: 1 })
      .withMessage('Analysis ID must be a positive integer')
  ]),
  analysisController.getAnalysis
);

/**
 * @route GET /api/analysis
 * @desc Get all analyses for the current user
 * @access Private
 */
router.get('/', analysisController.getUserAnalyses);

module.exports = router;
