/**
 * Validation middleware for the analysis service
 * Uses express-validator to validate request data
 */

const { validationResult } = require('express-validator');

/**
 * Middleware to validate request data against defined validation rules
 * @param {Array} validations - Array of express-validator validation chains
 * @returns {Function} - Express middleware function
 */
const validate = (validations) => {
  return async (req, res, next) => {
    // Execute all validations
    await Promise.all(validations.map(validation => validation.run(req)));

    // Check if there are validation errors
    const errors = validationResult(req);
    
    if (errors.isEmpty()) {
      return next();
    }

    // Format validation errors
    const formattedErrors = errors.array().map(error => ({
      field: error.param,
      message: error.msg
    }));

    // Return validation error response
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: formattedErrors
      }
    });
  };
};

module.exports = {
  validate
};
