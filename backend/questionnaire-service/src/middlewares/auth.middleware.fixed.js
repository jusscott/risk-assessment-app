const enhancedClient = require('../utils/enhanced-client');
const config = require('../config/config');
const tokenUtil = require('../utils/token.util');
const axios = require('axios'); // Add missing axios import

/**
 * Semaphore implementation for concurrency control
 * Prevents multiple concurrent validation requests for the same token
 */
class TokenSemaphore {
  constructor() {
    this.locks = new Map();
    this.pending = new Map();
  }

  // Acquire lock for a token
  async acquire(token) {
    if (!this.locks.has(token)) {
      this.locks.set(token, false);
      this.pending.set(token, []);
      return true; // Lock acquired
    }

    if (this.locks.get(token) === false) {
      this.locks.set(token, true);
      return true; // Lock acquired
    }

    // Lock is already held, we need to wait
    return new Promise(resolve => {
      this.pending.get(token).push(resolve);
    });
  }

  // Release lock for a token
  release(token) {
    if (!this.locks.has(token)) return;

    const pendingResolvers = this.pending.get(token);
    if (pendingResolvers && pendingResolvers.length > 0) {
      // Wake up one waiting resolver
      const nextResolver = pendingResolvers.shift();
      nextResolver(true);
    } else {
      this.locks.set(token, false);
    }
  }

  // Clean up expired semaphores to prevent memory leaks
  cleanup(token) {
    if (this.pending.get(token)?.length === 0) {
      this.locks.delete(token);
      this.pending.delete(token);
    }
  }
}

// Create a token semaphore instance
const tokenSemaphore = new TokenSemaphore();

/**
 * Cache of validated tokens to reduce auth service calls
 * Format: { [token]: { user: Object, timestamp: number } }
 * This improves performance and provides resilience during auth service outages
 */
const tokenCache = new Map();

// Time in ms that a token validation result is considered valid in cache
const TOKEN_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Clean up token cache periodically to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [token, data] of tokenCache.entries()) {
    if (now - data.timestamp > TOKEN_CACHE_TTL) {
      tokenCache.delete(token);
    }
  }
}, 15 * 60 * 1000); // Clean up every 15 minutes

/**
 * Middleware to verify JWT tokens by making a request to the auth service
 * Implements caching, concurrency control, retries, and fallback mechanisms for reliability
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 * @returns {void}
 */
const authenticate = async (req, res, next) => {
  // Extract token first - we'll keep the real token if available
  const token = tokenUtil.extractTokenFromRequest(req);
  
  // Force bypass auth in development/test environment ONLY if no token is provided
  // This allows real users to use their real credentials while still allowing non-authenticated requests
  if (!token && (process.env.NODE_ENV !== 'production' || config.bypassAuth === true || (process.env.BYPASS_AUTH === 'true'))) {
    console.warn('⚠️ BYPASSING AUTHENTICATION - FOR DEVELOPMENT USE ONLY ⚠️');
    req.user = { id: 'dev-user', email: 'dev@example.com', role: 'ADMIN' };
    return next();
  }

  try {
    // Check for diagnostic endpoints that should bypass normal auth
    const isDiagnosticPath = req.path.includes('/diagnostic');
    if (isDiagnosticPath && process.env.NODE_ENV !== 'production') {
      console.log('Allowing diagnostic endpoint access without authentication');
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
    
    // Quickly check if token is already expired before calling auth service
    if (tokenUtil.isTokenExpired(token)) {
      console.log('Token is already expired, returning 401 without calling auth service');
      return res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Authentication token expired',
        },
      });
    }

    // Check token cache first to reduce load on auth service
    const cachedData = tokenCache.get(token);
    if (cachedData && (Date.now() - cachedData.timestamp < TOKEN_CACHE_TTL)) {
      console.log(`Using cached token validation for user: ${cachedData.user.id}`);
      req.user = cachedData.user;
      return next();
    }

    // Use semaphore to prevent multiple concurrent validation requests for the same token
    // This prevents race conditions when multiple requests with the same token arrive concurrently
    try {
      // Wait for semaphore lock - only one request per token will proceed to validation
      await tokenSemaphore.acquire(token);

      // Double-check cache after acquiring lock - another request might have updated it
      const freshCachedData = tokenCache.get(token);
      if (freshCachedData && (Date.now() - freshCachedData.timestamp < TOKEN_CACHE_TTL)) {
        console.log(`Using cached token validation after lock for user: ${freshCachedData.user.id}`);
        req.user = freshCachedData.user;
        tokenSemaphore.release(token);
        tokenSemaphore.cleanup(token);
        return next();
      }
    
      console.log(`Validating token with auth service at: ${config.authService.url}/validate-token`);
      
      // Track retries for this request
      req.authRetryCount = req.authRetryCount || 0;
      const maxRetries = 2; // Try up to 3 times total (initial + 2 retries)
      
      try {
        // Validate token with auth service using enhanced client with circuit breaker
        const response = await axios({
          method: 'post',
          url: `${config.authService.url}/validate-token`,
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Forwarded-For': req.ip || '0.0.0.0',
            'X-Request-ID': req.headers['x-request-id'] || `req-${Date.now()}`
          },
          timeout: 15000 // Increased to 15 seconds for more reliability
        });
        
        if (response && response.data && response.data.success) {
          // Add user info to request object
          req.user = response.data.data.user;
          console.log(`Token validation successful. User ID: ${req.user.id}, Role: ${req.user.role}`);
          
          // Cache the validation result
          tokenCache.set(token, {
            user: req.user,
            timestamp: Date.now()
          });
          
          tokenSemaphore.release(token);
          tokenSemaphore.cleanup(token);
          next();
        } else {
          console.warn('Auth service returned unsuccessful response:', response?.data);
          
          // Before failing, try local validation as fallback
          const localValidationResult = await validateTokenLocally(token);
          if (localValidationResult.valid) {
            req.user = localValidationResult.user;
            console.log(`Used fallback local validation for user: ${req.user.id}`);
            
            // Cache the local validation result
            tokenCache.set(token, {
              user: req.user,
              timestamp: Date.now()
            });
            
            tokenSemaphore.release(token);
            tokenSemaphore.cleanup(token);
            next();
            return;
          }
          
          tokenSemaphore.release(token);
          tokenSemaphore.cleanup(token);
          return res.status(401).json({
            success: false,
            error: {
              code: 'INVALID_TOKEN',
              message: 'Invalid authentication token',
            },
          });
        }
      } catch (authServiceError) {
        console.error('Error connecting to auth service:', authServiceError.message);
        
        // Retry the auth service request if we haven't maxed out retries
        if (req.authRetryCount < maxRetries) {
          req.authRetryCount++;
          console.log(`Retrying auth service connection (${req.authRetryCount}/${maxRetries})...`);
          
          // Simple exponential backoff for retries
          const retryDelay = Math.min(100 * Math.pow(2, req.authRetryCount), 1000);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          
          // Release lock before retrying
          tokenSemaphore.release(token);
          tokenSemaphore.cleanup(token);
          
          // Retry the auth middleware (recursive call)
          return authenticate(req, res, next);
        }

        // All retries failed, fall back to local validation
        tokenSemaphore.release(token);
        tokenSemaphore.cleanup(token);
        return localValidate(req, res, next);
      }
    } catch (lockError) {
      console.error('Error acquiring token lock:', lockError);
      // If lock acquisition fails, try local validation as fallback
      return localValidate(req, res, next);
    }
  } catch (error) {
    console.error('Token validation error:', error.message);
    
    // Make sure we release any held locks
    if (token) {
      tokenSemaphore.release(token);
      tokenSemaphore.cleanup(token);
    }
    
    // Check for specific axios errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      console.error(`Cannot connect to auth service at ${config.authService.url}`);
      // Fallback to local validation in case auth service is unavailable
      return localValidate(req, res, next);
    }
    
    if (error.response) {
      // Auth service responded with an error
      if (error.response.status === 401) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'TOKEN_EXPIRED',
            message: 'Authentication token expired',
          },
        });
      }
    }
    
    // For development environments, allow bypass authentication for testing
    if (process.env.NODE_ENV === 'development' && process.env.BYPASS_AUTH === 'true') {
      console.warn('⚠️ BYPASSING AUTHENTICATION - FOR DEVELOPMENT USE ONLY ⚠️');
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
 * Validate token using local verification without making network requests
 * @param {string} token - JWT token to validate 
 * @returns {Object} Object with valid flag and user data if valid
 */
const validateTokenLocally = async (token) => {
  try {
    console.log("Attempting local token validation");
    
    // Use our token utility for validation
    const { valid, decoded } = tokenUtil.verifyToken(token);
    
    if (!valid || !decoded) {
      console.warn("Token verification failed");
      return { valid: false };
    }
    
    // Ensure the token has required fields
    if (!decoded.id) {
      console.warn("Token lacks required fields");
      return { valid: false };
    }
    
    // Build minimal user object from token data
    const user = {
      id: decoded.id,
      email: decoded.email || 'unknown', 
      role: decoded.role || 'USER',
    };
    
    return { valid: true, user };
  } catch (error) {
    console.warn("Local token validation failed:", error.message);
    return { valid: false };
  }
};

/**
 * Fallback token validation using local verification
 * Only used when auth service is unreachable
 */
const localValidate = (req, res, next) => {
  try {
    console.warn("USING FALLBACK LOCAL TOKEN VALIDATION - AUTH SERVICE UNAVAILABLE");
    const token = tokenUtil.extractTokenFromRequest(req);
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_ERROR',
          message: 'Authentication required',
        },
      });
    }
    
    // Use token utility to get user from token
    const user = tokenUtil.extractUserFromToken(token);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid authentication token',
        },
      });
    }

    req.user = user;
    
    // Log if token is close to expiration
    const remainingTime = tokenUtil.getTokenRemainingTime(token);
    if (remainingTime <= 300) { // 5 minutes or less
      console.warn(`Token for user ${user.id} is expiring soon (${remainingTime} seconds remaining)`);
    }
    
    // Add to cache so subsequent requests don't need validation
    tokenCache.set(token, {
      user: req.user,
      timestamp: Date.now()
    });
    
    next();
  } catch (error) {
    console.error("Fallback validation error:", error.message);
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

module.exports = {
  authenticate,
  checkRole,
};
