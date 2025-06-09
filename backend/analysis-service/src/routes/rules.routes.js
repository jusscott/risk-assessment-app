/**
 * Routes for custom rules functionality
 */

const express = require('express');
const { param, body } = require('express-validator');
const router = express.Router();
const rulesController = require('../controllers/rules.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validation.middleware');

// Apply authentication middleware to all routes
router.use(authenticate);

/**
 * @route GET /api/rules
 * @desc Get all rules for the authenticated user
 * @access Private
 */
router.get('/', rulesController.getRules);

/**
 * @route GET /api/rules/:ruleId
 * @desc Get a specific rule by ID
 * @access Private
 */
router.get('/:ruleId',
  validate([
    param('ruleId')
      .isInt({ min: 1 })
      .withMessage('Rule ID must be a positive integer')
  ]),
  rulesController.getRuleById
);

/**
 * @route POST /api/rules
 * @desc Create a new custom rule
 * @access Private
 */
router.post('/',
  validate([
    body('name')
      .isString()
      .notEmpty()
      .withMessage('Rule name is required'),
    body('criteria')
      .isObject()
      .withMessage('Valid rule criteria is required'),
    body('severity')
      .isInt({ min: 1, max: 5 })
      .withMessage('Severity must be a number between 1 and 5'),
    body('category')
      .isString()
      .notEmpty()
      .withMessage('Category is required')
  ]),
  rulesController.createRule
);

/**
 * @route PUT /api/rules/:ruleId
 * @desc Update an existing custom rule
 * @access Private
 */
router.put('/:ruleId',
  validate([
    param('ruleId')
      .isInt({ min: 1 })
      .withMessage('Rule ID must be a positive integer'),
    body('name')
      .optional()
      .isString()
      .notEmpty()
      .withMessage('Rule name must be a non-empty string'),
    body('criteria')
      .optional()
      .isObject()
      .withMessage('Rule criteria must be a valid object'),
    body('severity')
      .optional()
      .isInt({ min: 1, max: 5 })
      .withMessage('Severity must be a number between 1 and 5'),
    body('category')
      .optional()
      .isString()
      .notEmpty()
      .withMessage('Category must be a non-empty string'),
    body('active')
      .optional()
      .isBoolean()
      .withMessage('Active must be a boolean value')
  ]),
  rulesController.updateRule
);

/**
 * @route DELETE /api/rules/:ruleId
 * @desc Delete a custom rule
 * @access Private
 */
router.delete('/:ruleId',
  validate([
    param('ruleId')
      .isInt({ min: 1 })
      .withMessage('Rule ID must be a positive integer')
  ]),
  rulesController.deleteRule
);

/**
 * @route POST /api/rules/analyses/:analysisId/evaluate
 * @desc Evaluate all rules for an analysis
 * @access Private
 */
router.post('/analyses/:analysisId/evaluate',
  validate([
    param('analysisId')
      .isInt({ min: 1 })
      .withMessage('Analysis ID must be a positive integer')
  ]),
  rulesController.evaluateRules
);

/**
 * @route GET /api/rules/analyses/:analysisId/results
 * @desc Get rule evaluation results for an analysis
 * @access Private
 */
router.get('/analyses/:analysisId/results',
  validate([
    param('analysisId')
      .isInt({ min: 1 })
      .withMessage('Analysis ID must be a positive integer')
  ]),
  rulesController.getRuleResults
);

module.exports = router;
