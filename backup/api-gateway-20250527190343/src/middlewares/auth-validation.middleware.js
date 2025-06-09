/**
 * Validation middleware for authentication endpoints
 * Ensures consistent response format for validation errors
 */

const { check } = require('express-validator');

// Registration request validation rules
const validateRegisterRequest = [
  check('email')
    .isEmail()
    .withMessage('Please provide a valid email address'),
  
  check('password')
    .isLength({ min: 8, max: 64 })
    .withMessage('Password must be between 8 and 64 characters'),
    
  check('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
    
  check('company')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Company name must be between 2 and 100 characters')
];

// Login request validation rules
const validateLoginRequest = [
  check('email')
    .isEmail()
    .withMessage('Please provide a valid email address'),
    
  check('password')
    .exists()
    .withMessage('Password is required')
];

// Password reset request validation rules
const validatePasswordResetRequest = [
  check('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
];

// Password update validation rules
const validatePasswordUpdateRequest = [
  check('currentPassword')
    .exists()
    .withMessage('Current password is required'),
    
  check('newPassword')
    .isLength({ min: 8, max: 64 })
    .withMessage('New password must be between 8 and 64 characters'),
    
  check('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Password confirmation does not match new password');
      }
      return true;
    })
];

module.exports = {
  validateRegisterRequest,
  validateLoginRequest,
  validatePasswordResetRequest,
  validatePasswordUpdateRequest
};
