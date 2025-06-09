/**
 * Auth routes for API Gateway
 * Handles authentication requests with proper validation
 */

const express = require('express');
const { validateRequest } = require('../middlewares/validation.middleware');
const { 
  validateRegisterRequest, 
  validateLoginRequest,
  validatePasswordResetRequest,
  validatePasswordUpdateRequest 
} = require('../middlewares/auth-validation.middleware');
const { createServiceProxy } = require('../middlewares/proxy.middleware');
const router = express.Router();

// Get auth service URL from environment
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://auth-service:5001';

// Create proxy to auth service
const authServiceProxy = createServiceProxy({
  serviceName: 'auth-service',
  serviceUrl: AUTH_SERVICE_URL,
  pathRewrite: { '^/api/auth': '' }, // Strip "/api/auth" prefix when forwarding (no trailing slash)
  timeout: 30000
});

// Registration endpoint with validation
router.post('/register', validateRegisterRequest, validateRequest, (req, res, next) => {
  // Forward to auth service after validation passes
  authServiceProxy(req, res, next);
});

// Login endpoint with validation
router.post('/login', validateLoginRequest, validateRequest, (req, res, next) => {
  authServiceProxy(req, res, next);
});

// Password reset request endpoint with validation
router.post('/password-reset', validatePasswordResetRequest, validateRequest, (req, res, next) => {
  authServiceProxy(req, res, next);
});

// Password update endpoint with validation
router.post('/password-update', validatePasswordUpdateRequest, validateRequest, (req, res, next) => {
  authServiceProxy(req, res, next);
});

// Forward all other auth requests to auth service
router.use('/', (req, res, next) => {
  authServiceProxy(req, res, next);
});

module.exports = router;
