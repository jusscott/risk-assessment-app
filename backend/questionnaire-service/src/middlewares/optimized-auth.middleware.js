/**
 * Enhanced authentication middleware with optimizations for concurrent requests
 * Addresses JWT validation errors during high concurrency by:
 * 1. Using a request coalescing pattern to deduplicate concurrent validations
 * 2. Implementing token-level locking to prevent race conditions
 * 3. Using enhanced caching with adaptive TTL based on token usage
 * 4. Adding circuit breaker pattern specific to token validation
 */

const axios = require('axios');
const config = require('../config/config');
const tokenUtil = require('../utils/token.util');
const enhancedClient = require('../utils/enhanced-client');

/**
 * Enhanced token cache with improved handling for concurrent requests
 * Format: { 
 *   [token]: { 
 *     user: Object,
 *     timestamp: number,
 *     usageCount: number,
 *     pendingValidation: boolean,
 *     validationPromise: Promise|null,
 *     lastUsed: number
 *   } 
 * }
 */
const tokenCache = {};

// Track pending validation requests to deduplicate concurrent validation
const pendingValidations = new Map();

// Base time in ms that a token validation result is considered valid in cache
const BASE_TOKEN_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// Maximum time a token can be cached regardless of usage
const MAX_TOKEN_CACHE_TTL = 25 * 60 * 1000; // 25 minutes

// Clean up token cache periodically to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  let expiredCount = 0;
  
  Object.keys(tokenCache).forEach(token => {
    const cacheEntry = tokenCache[token];
    
    // Calculate adaptive TTL based on usage (higher usage = longer TTL)
    const adaptiveTTL = Math.min(
      BASE_TOKEN_CACHE_TTL * Math.log10(cacheEntry.usageCount + 1),
      MAX_TOKEN_CACHE_TTL
    );
    
    // Clean up if token is expired or hasn't been used recently
    if ((now - cacheEntry.timestamp > adaptiveTTL) || 
        (now - cacheEntry.lastUsed > 30 * 60 * 1000)) { // 30 minutes of no usage
      delete tokenCache[token];
      expiredCount++;
    }
  });
  
  // Also clean up any stale pending validations
  const stalePendingCount = cleanupStalePendingValidations();
  
  if (expiredCount > 0 || stalePendingCount > 0) {
    console.log(`Auth cache cleanup: removed ${expiredCount} expired tokens and ${stalePendingCount} stale pending validations.`);
  }
}, 5 * 60 * 1000); // Clean up every 5 minutes

/**
 * Clean up stale pending validations (older than 30 seconds)
 * @returns {number} Number of stale validations removed
 */
const cleanupStalePendingValidations = () => {
  const now = Date.now();
  let removedCount = 0;
  
  for (const [token, data] of pendingValidations.entries()) {
    if (now - data.timestamp > 30000) { // 30 seconds timeout
      pendingValidations.delete(token);
      removedCount++;
    }
  }
  
  return removedCount;
};

/**
 * Enhanced middleware to verify JWT tokens with optimizations for concurrent requests
 * Uses request coalescing pattern to deduplicate validation requests for the same token
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 * @returns {void}
 */
const authenticate = async (req, res, next) => {
  // Extract token first - we'll keep the real token if available
  const token = tokenUtil.extractTokenFromRequest(req);
  
  // Generate a unique request ID for debugging
  const requestId = req.headers['x-request-id'] || `req-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
  
  // Force bypass auth in development/test environment ONLY if no token is provided
  if (!token && (process.env.NODE_ENV !== 'production' || config.bypassAuth === true || (process.env.BYPASS_AUTH === 'true'))) {
    console.warn(`[${requestId}] ⚠️ BYPASSING AUTHENTICATION - FOR DEVELOPMENT USE ONLY ⚠️`);
    req.user = { id: 'dev-user', email: 'dev@example.com', role: 'ADMIN' };
    return next();
  }

  try {
    // Check for diagnostic endpoints that should bypass normal auth
    const isDiagnosticPath = req.path.includes('/diagnostic');
    if (isDiagnosticPath && process.env.NODE_ENV !== 'production') {
      console.log(`[${requestId}] Allowing diagnostic endpoint access without authentication`);
      req.user = { id: 'system', role: 'SYSTEM' };
      return next();
    }
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_ERROR',
          message: 'Authentication required',
        },
      });
    }
    
    // Quickly check if token is already expired before any further processing
    if (tokenUtil.isTokenExpired(token)) {
      console.log(`[${requestId}] Token is already expired, returning 401 without calling auth service`);
      return res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Authentication token expired',
        },
      });
    }
    
    // Check token cache first to reduce load on auth service
    if (tokenCache[token]) {
      // Update usage metrics
      tokenCache[token].usageCount++;
      tokenCache[token].lastUsed = Date.now();
      
      // Calculate adaptive TTL based on usage (higher usage = longer TTL)
      const adaptiveTTL = Math.min(
        BASE_TOKEN_CACHE_TTL * Math.log10(tokenCache[token].usageCount + 1),
        MAX_TOKEN_CACHE_TTL
      );
      
      // Check if token is still valid based on adaptive TTL
      if (Date.now() - tokenCache[token].timestamp < adaptiveTTL) {
        console.log(`[${requestId}] Using cached token validation for user: ${tokenCache[token].user.id} (usage: ${tokenCache[token].usageCount})`);
        req.user = tokenCache[token].user;
        return next();
      }
    }
    
    // Check if there's already a pending validation for this token (request coalescing)
    if (pendingValidations.has(token)) {
      const pendingData = pendingValidations.get(token);
      console.log(`[${requestId}] Joining existing validation request for token (created ${Date.now() - pendingData.timestamp}ms ago)`);
      
      try {
        // Wait for the existing validation to complete
        const result = await pendingData.promise;
        
        if (result.valid) {
          req.user = result.user;
          return next();
        } else {
          return res.status(401).json({
            success: false,
            error: {
              code: result.code || 'INVALID_TOKEN',
              message: result.message || 'Invalid authentication token',
            },
          });
        }
      } catch (error) {
        console.error(`[${requestId}] Error while waiting for existing validation:`, error);
        // If waiting for the existing validation fails, perform local validation
        return performLocalValidation(token, req, res, next, requestId);
      }
    }
    
    // No valid cache entry and no pending validation, so create a new validation request
    console.log(`[${requestId}] Validating token with auth service at: ${config.authService.url}/validate-token`);
    
    // Create a validation promise to track this validation request
    const validationPromise = validateTokenWithAuthService(token, requestId);
    
    // Register this validation request so other concurrent requests can use it
    pendingValidations.set(token, {
      promise: validationPromise,
      timestamp: Date.now()
    });
    
    try {
      // Wait for our validation to complete
      const result = await validationPromise;
      
      // Remove this validation from pending map after completion
      pendingValidations.delete(token);
      
      if (result.valid) {
        // Add user info to request object
        req.user = result.user;
        
        // Cache the validation result
        tokenCache[token] = {
          user: result.user,
          timestamp: Date.now(),
          usageCount: tokenCache[token]?.usageCount || 1,
          lastUsed: Date.now()
        };
        
        next();
      } else {
        return res.status(401).json({
          success: false,
          error: {
            code: result.code || 'INVALID_TOKEN',
            message: result.message || 'Invalid authentication token',
          },
        });
      }
    } catch (error) {
      // Remove this validation from pending map after error
      pendingValidations.delete(token);
      
      console.error(`[${requestId}] Error during token validation:`, error.message);
      
      // Fall back to local validation
      return performLocalValidation(token, req, res, next, requestId);
    }
  } catch (error) {
    console.error(`[${requestId}] Unexpected token validation error:`, error.message);
    
    // For development environments, allow bypass authentication for testing
    if (process.env.NODE_ENV === 'development' && process.env.BYPASS_AUTH === 'true') {
      console.warn(`[${requestId}] ⚠️ BYPASSING AUTHENTICATION - FOR DEVELOPMENT USE ONLY ⚠️`);
      req.user = { id: 'dev-user', email: 'dev@example.com', role: 'USER' };
      return next();
    }
    
    return res.status(401).json({
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: 'Failed to authenticate user',
      },
    });
  }
};

/**
 * Validate token using auth service with retries and circuit breaker
 * @param {string} token - JWT token to validate
 * @param {string} requestId - Unique request ID for logging
 * @returns {Promise<Object>} - Resolution with validation result
 */
const validateTokenWithAuthService = async (token, requestId) => {
  // Enhanced for real users - added debugging information
  console.log(`[Authentication] Validating token for requestId: ${requestId}`);
  
  try {
    // Check if token is a test token or real user token
    const isTestToken = token.includes('test') || token.length < 100;
    if (isTestToken) {
      console.log(`[Authentication] Detected test token`);
    } else {
      console.log(`[Authentication] Processing real user token`);
    }
  } catch (err) {
    // Continue even if token inspection fails
    console.log(`[Authentication] Could not inspect token type: ${err.message}`);
  }
  // Track retries for this request
  let retryCount = 0;
  const maxRetries = 2; // Try up to 3 times total (initial + 2 retries)
  
  // Use enhanced client with circuit breaker capabilities
  try {
    const response = await enhancedClient.request({
      service: 'auth',  // Added missing service parameter
      method: 'post',
      url: '/validate-token',  // Use path only, not full URL
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Request-ID': requestId
      },
      timeout: 10000, // 10 seconds
      circuitBreaker: {
        enabled: true,
        identifier: 'auth-service-token-validation',
        failureThreshold: 5,
        resetTimeout: 30000
      }
    });
    
    if (response && response.data && response.data.success) {
          // Ensure consistent user ID format between services
          if (response.data.data.user && response.data.data.user.id) {
            // Make sure user ID is always treated as string to avoid type mismatches
            if (typeof response.data.data.user.id !== 'string') {
              response.data.data.user.id = String(response.data.data.user.id);
              console.log(`[Authentication] Normalized user ID to string: ${response.data.data.user.id}`);
            }
          }
      return {
        valid: true,
        user: response.data.data.user
      };
    } else {
      console.warn(`[${requestId}] Auth service returned unsuccessful response:`, response.data);
      return {
        valid: false,
        code: 'INVALID_TOKEN',
        message: 'Invalid authentication token'
      };
    }
  } catch (error) {
    // Handle specific types of errors
    if (error.code === 'CIRCUIT_OPEN') {
      console.warn(`[${requestId}] Circuit breaker open for auth service, using local validation`);
      const localResult = await validateTokenLocally(token, requestId);
      return localResult;
    }
    
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
      console.error(`[${requestId}] Network error connecting to auth service:`, error.code);
      
      // Retry with exponential backoff
      if (retryCount < maxRetries) {
        retryCount++;
        console.log(`[${requestId}] Retrying auth service connection (${retryCount}/${maxRetries})...`);
        
        // Simple exponential backoff for retries
        const retryDelay = Math.min(100 * Math.pow(2, retryCount), 1000);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        
        // Retry the validation (recursive call)
        return validateTokenWithAuthService(token, requestId);
      }
      
      // If all retries fail, fall back to local validation
      console.warn(`[${requestId}] All retries failed, falling back to local validation`);
      return validateTokenLocally(token, requestId);
    }
    
    throw error; // Re-throw any other errors
  }
};

/**
 * Validate token using local verification without making network requests
 * @param {string} token - JWT token to validate
 * @param {string} requestId - Unique request ID for logging
 * @returns {Object} Object with valid flag and user data if valid
 */
const validateTokenLocally = async (token, requestId) => {
  try {
    console.log(`[${requestId}] Attempting local token validation`);
    
    // Use our token utility for validation
    const { valid, decoded } = tokenUtil.verifyToken(token);
    
    if (!valid || !decoded) {
      console.warn(`[${requestId}] Token verification failed`);
      return { valid: false };
    }
    
    // Ensure the token has required fields
    if (!decoded.id) {
      console.warn(`[${requestId}] Token lacks required fields`);
      return { valid: false };
    }
    
    // Build minimal user object from token data
    const user = {
      id: typeof decoded.id !== 'string' ? String(decoded.id) : decoded.id,
      email: decoded.email || 'unknown', 
      role: decoded.role || 'USER',
    };
    
    return { valid: true, user };
  } catch (error) {
    console.warn(`[${requestId}] Local token validation failed:`, error.message);
    return { valid: false };
  }
};

/**
 * Fall back to local token validation when auth service is unavailable
 * @param {string} token - JWT token to validate
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 * @param {string} requestId - Unique request ID for logging
 */
const performLocalValidation = async (token, req, res, next, requestId) => {
  try {
    console.warn(`[${requestId}] USING FALLBACK LOCAL TOKEN VALIDATION - AUTH SERVICE UNAVAILABLE`);
    
    const validationResult = await validateTokenLocally(token, requestId);
    
    if (!validationResult.valid) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid authentication token',
        },
      });
    }

    req.user = validationResult.user;
    
    // Log if token is close to expiration
    const remainingTime = tokenUtil.getTokenRemainingTime(token);
    if (remainingTime <= 300) { // 5 minutes or less
      console.warn(`[${requestId}] Token for user ${validationResult.user.id} is expiring soon (${remainingTime} seconds remaining)`);
    }
    
    // Add to cache so subsequent requests don't need validation
    tokenCache[token] = {
      user: req.user,
      timestamp: Date.now(),
      usageCount: tokenCache[token]?.usageCount || 1,
      lastUsed: Date.now()
    };
    
    next();
  } catch (error) {
    console.error(`[${requestId}] Fallback validation error:`, error.message);
    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid authentication token',
      },
    });
  }
};

/**
 * Middleware to check if user has required role
 * @param {Array} roles - Array of allowed roles
 * @returns {Function} - Express middleware function
 */
const checkRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_ERROR',
          message: 'Authentication required',
        },
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to access this resource',
        },
      });
    }

    next();
  };
};

// Export public API
module.exports = {
  authenticate,
  checkRole,
  // For testing and monitoring
  getTokenCacheStats: () => ({
    size: Object.keys(tokenCache).length,
    pendingValidations: pendingValidations.size
  }),
  clearTokenCache: () => {
    Object.keys(tokenCache).forEach(key => delete tokenCache[key]);
    pendingValidations.clear();
    console.log('Token cache and pending validations cleared');
  }
};
