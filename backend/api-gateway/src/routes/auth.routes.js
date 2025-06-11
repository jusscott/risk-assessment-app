/**
 * Auth routes for API Gateway
 * Simple forwarding to auth service - proxy is handled at the main level
 */

const express = require('express');
const router = express.Router();

// Simple pass-through routes - the main auth service proxy will handle everything
router.use('/', (req, res, next) => {
  // This route will be handled by the main authServiceProxy in index.js
  // We're just marking this as an auth route for middleware purposes
  next();
});

module.exports = router;
