/**
 * Token utility functions for consistent token handling across the application
 */
const jwt = require('jsonwebtoken');
const config = require('../config/config');

// Cache of decoded tokens to prevent repeated JWT decoding operations
const decodedTokenCache = new Map();

/**
 * Extract the JWT token from the Authorization header
 * @param {Object} req - Express request object
 * @returns {string|null} - The JWT token or null if not found
 */
const extractTokenFromRequest = (req) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  return authHeader.split(' ')[1];
};

/**
 * Decode a JWT token without verifying signature
 * @param {string} token - JWT token to decode
 * @returns {Object|null} - Decoded token payload or null if invalid
 */
const decodeToken = (token) => {
  if (!token) return null;
  
  // Check cache first
  if (decodedTokenCache.has(token)) {
    return decodedTokenCache.get(token);
  }
  
  try {
    // jwt.decode just decodes without verification
    const decoded = jwt.decode(token);
    
    // Enhanced: ensure ID is properly formatted
    if (decoded && decoded.id !== undefined && decoded.id !== null) {
      // Always convert IDs to strings for consistent handling
      decoded.id = String(decoded.id);
    }
    
    // Cache the result for future use
    if (decoded) {
      decodedTokenCache.set(token, decoded);
      
      // Limit cache size to prevent memory issues
      if (decodedTokenCache.size > 1000) {
        // Remove oldest entry
        const firstKey = decodedTokenCache.keys().next().value;
        decodedTokenCache.delete(firstKey);
      }
    }
    
    return decoded;
  } catch (error) {
    // More detailed error logging to diagnose real user token issues
    console.error(`Token verification failed: ${error.message}`);
    if (error.name === 'TokenExpiredError') {
      console.log('Token expired at:', error.expiredAt);
    } else if (error.name === 'JsonWebTokenError') {
      console.log('JWT error reason:', error.message);
    }
    return { valid: false, decoded: null };
  }
};

/**
 * Verify a JWT token locally
 * @param {string} token - JWT token to verify
 * @returns {Object} - Result with valid flag and decoded token
 */
const verifyToken = (token) => {
  // Enhanced error handling for real users
  if (!token) {
    console.warn('Attempted to verify null or undefined token');
    return { valid: false, decoded: null };
  }
  
  try {
    // Consistent secret handling - must match auth service's secret
    const jwtSecret = process.env.AUTH_JWT_SECRET || 
                      process.env.JWT_SECRET || 
                      config.jwt.secret || 
                      'shared-security-risk-assessment-secret-key';
    
    // Verify token signature and expiration
    const decoded = jwt.verify(token, jwtSecret);
    
    // Clear any cached decoded version and replace with verified version
    decodedTokenCache.set(token, decoded);
    
    return { valid: true, decoded };
  } catch (error) {
    console.error('Token verification failed:', error.message);
    
    // Enhanced fallback during circuit breaker activation:
    // If auth service is unavailable (indicated by circuit breaker),
    // try to extract basic information from the token without verification
    if (process.env.CIRCUIT_BREAKER_FALLBACK_ENABLED === 'true') {
      try {
        console.log('CIRCUIT BREAKER ACTIVE: Attempting relaxed token validation');
        // Just decode without verification as last resort
        const decoded = jwt.decode(token);
        if (decoded && decoded.id && decoded.exp && decoded.exp * 1000 > Date.now()) {
          console.log('Using unverified but valid-format token due to auth service unavailability');
          return { 
            valid: true, 
            decoded, 
            fallback: true  // Flag that this was fallback validation
          };
        }
      } catch (fallbackError) {
        console.error('Fallback token processing failed:', fallbackError.message);
      }
    }
    
    return { valid: false, decoded: null, error: error.message };
  }
};

/**
 * Extract user information from a token
 * @param {string} token - JWT token
 * @returns {Object|null} - User object or null if invalid
 */
const extractUserFromToken = (token) => {
  // Enhanced for real users to be more resilient
  if (!token) {
    console.warn('Attempted to extract user from null or undefined token');
    return null;
  }
  const { valid, decoded, fallback } = verifyToken(token);
  
  if (!valid || !decoded) {
    return null;
  }
  
  // Ensure we have minimum required user information
  if (!decoded.id) {
    return null;
  }
  
  // Return standardized user object
  const user = {
    id: typeof decoded.id !== 'string' ? String(decoded.id) : decoded.id,
    email: decoded.email || 'unknown',
    role: decoded.role || 'USER',
    // Add any additional fields as needed
  };
  
  // Add fallback flag for monitoring/debugging 
  if (fallback) {
    user._fallbackValidation = true;
  }
  
  return user;
};

/**
 * Check if a token is expired
 * @param {string} token - JWT token
 * @returns {boolean} - True if token is expired or invalid
 */
const isTokenExpired = (token) => {
  const decoded = decodeToken(token);
  
  if (!decoded || !decoded.exp) {
    return true;
  }
  
  // JWT exp is in seconds, Date.now() is in milliseconds
  const expirationTime = decoded.exp * 1000;
  const currentTime = Date.now();
  
  return currentTime >= expirationTime;
};

/**
 * Get token remaining lifetime in seconds
 * @param {string} token - JWT token
 * @returns {number} - Seconds until token expires, 0 if expired
 */
const getTokenRemainingTime = (token) => {
  const decoded = decodeToken(token);
  
  if (!decoded || !decoded.exp) {
    return 0;
  }
  
  // JWT exp is in seconds, Date.now() is in milliseconds
  const expirationTime = decoded.exp * 1000;
  const currentTime = Date.now();
  const remainingMs = Math.max(0, expirationTime - currentTime);
  
  return Math.floor(remainingMs / 1000);
};

module.exports = {
  extractTokenFromRequest,
  decodeToken,
  verifyToken,
  extractUserFromToken,
  isTokenExpired,
  getTokenRemainingTime
};
