/**
 * Routes for industry benchmarking
 */

const express = require('express');
const { param, body } = require('express-validator');
const router = express.Router();
const benchmarkController = require('../controllers/benchmark.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validation.middleware');

// Apply authentication middleware to all routes
router.use(authenticate);

/**
 * @route GET /api/benchmarks/industries
 * @desc Get all available industries
 * @access Private
 */
router.get('/industries', benchmarkController.getIndustries);

/**
 * @route GET /api/benchmarks/frameworks
 * @desc Get available frameworks for benchmarking
 * @access Private
 */
router.get('/frameworks', benchmarkController.getAvailableFrameworks);

/**
 * @route GET /api/benchmarks/availability
 * @desc Get benchmark data availability across industries and frameworks
 * @access Private
 */
router.get('/availability', benchmarkController.getBenchmarkAvailability);

/**
 * @route GET /api/benchmarks/industries/:industryId/frameworks/:frameworkId
 * @desc Get benchmarks for a specific industry and framework
 * @access Private
 */
router.get('/industries/:industryId/frameworks/:frameworkId',
  validate([
    param('industryId')
      .isInt({ min: 1 })
      .withMessage('Industry ID must be a positive integer'),
    param('frameworkId')
      .isString()
      .withMessage('Framework ID must be a string')
  ]),
  benchmarkController.getIndustryBenchmarks
);

/**
 * @route POST /api/benchmarks/analyses/:analysisId/compare
 * @desc Generate benchmark comparisons for an analysis
 * @access Private
 */
router.post('/analyses/:analysisId/compare',
  validate([
    param('analysisId')
      .isInt({ min: 1 })
      .withMessage('Analysis ID must be a positive integer'),
    body('industryId')
      .isInt({ min: 1 })
      .withMessage('Industry ID must be a positive integer'),
    body('frameworkId')
      .isString()
      .withMessage('Framework ID must be a string')
  ]),
  benchmarkController.generateBenchmarkComparisons
);

module.exports = router;
