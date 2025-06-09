/**
 * Webhook routes for the analysis service
 */

const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const webhookController = require('../controllers/webhook.controller');
const { validate } = require('../middlewares/validation.middleware');

/**
 * @route POST /api/webhooks/questionnaire-completed
 * @desc Webhook endpoint for processing completed questionnaires
 * @access Private
 */
router.post('/questionnaire-completed', 
  validate([
    body('submissionId')
      .isInt({ min: 1 })
      .withMessage('Submission ID must be a positive integer'),
    body('userId')
      .notEmpty()
      .withMessage('User ID is required')
  ]),
  webhookController.processCompletedQuestionnaire
);

/**
 * @route POST /api/webhooks/analysis-completed
 * @desc Webhook endpoint to notify when analysis is completed
 * @access Private
 */
router.post('/analysis-completed',
  validate([
    body('analysisId')
      .isInt({ min: 1 })
      .withMessage('Analysis ID must be a positive integer')
  ]),
  webhookController.processCompletedAnalysis
);

module.exports = router;
