/**
 * Validation middleware for API Gateway
 * Provides request validation using express-validator
 */

const { validationResult } = require('express-validator');
const { ValidationError, asyncHandler } = require('./error.middleware');

/**
 * Validates request against rules and throws standardized validation errors
 * Must be used after express-validator rules
 * 
 * @example
 * router.post(
 *   '/users',
 *   [
 *     check('email').isEmail(),
 *     check('password').isLength({ min: 6 })
 *   ],
 *   validateRequest,
 *   createUser
 * );
 */
const validateRequest = asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorDetails = errors.array().map(error => ({
      field: error.param,
      message: error.msg,
      value: error.value
    }));
    
    // Return formatted error response directly instead of throwing
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: errorDetails
      }
    });
  }
  
  next();
});

/**
 * Validates that the request body contains valid JSON
 * Used early in the middleware chain to catch JSON parsing issues
 */
const validateJsonBody = (err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    const error = new ValidationError('Invalid JSON in request body');
    // Properly pass the error to the error handler
    return res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message
      }
    });
  }
  next(err); // Pass any other errors to the next error handler
};

module.exports = {
  validateRequest,
  validateJsonBody
};
