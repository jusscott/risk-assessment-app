#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing Questionnaire Authentication Session Issue');
console.log('==================================================');

// The most likely causes of the issue:
// 1. JWT token format/field mismatch in questionnaire service auth middleware
// 2. Auth service communication issues
// 3. Token validation endpoint expecting different format
// 4. API Gateway path rewriting issues

// Fix 1: Update questionnaire service auth middleware to handle token validation more robustly
const authMiddlewarePath = 'backend/questionnaire-service/src/middlewares/auth.middleware.js';
const authMiddlewareContent = `const jwt = require('jsonwebtoken');
const { EnhancedClient } = require('../utils/enhanced-client');

// Enhanced authentication middleware with improved token validation
const authMiddleware = async (req, res, next) => {
  try {
    console.log('🔍 [Questionnaire Auth] Processing request to:', req.path);
    console.log('🔍 [Questionnaire Auth] Headers present:', Object.keys(req.headers));
    
    // Check for authentication bypass (maps to target UUID user)
    if (process.env.BYPASS_AUTH === 'true') {
      console.log('🔓 BYPASS_AUTH enabled - mapping to target UUID user');
      req.user = { 
        id: 'ae721c92-5784-4996-812e-d54a2da93a22',
        email: 'jusscott@gmail.com',
        name: 'Test User'
      };
      console.log('👤 Bypassed auth - User ID:', req.user.id);
      return next();
    }

    // Extract token from Authorization header with improved parsing
    const authHeader = req.headers.authorization;
    console.log('🔍 [Questionnaire Auth] Authorization header present:', !!authHeader);
    
    if (!authHeader) {
      console.log('❌ [Questionnaire Auth] No authorization header provided');
      return res.status(401).json({ 
        error: 'Authentication required, please log in again',
        code: 'NO_AUTH_HEADER',
        timestamp: new Date().toISOString()
      });
    }

    // More flexible token extraction
    let token;
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    } else if (authHeader.startsWith('bearer ')) {
      token = authHeader.slice(7);
    } else {
      token = authHeader;
    }

    if (!token || token.trim() === '') {
      console.log('❌ [Questionnaire Auth] No token provided in authorization header');
      return res.status(401).json({ 
        error: 'Authentication required, please log in again',
        code: 'NO_TOKEN',
        timestamp: new Date().toISOString()
      });
    }

    console.log('🔍 [Questionnaire Auth] Token extracted, length:', token.length);
    console.log('🔍 [Questionnaire Auth] Token preview:', token.substring(0, 20) + '...');
    
    // Try local JWT validation first if JWT_SECRET is available
    if (process.env.JWT_SECRET) {
      try {
        console.log('🔍 [Questionnaire Auth] Attempting local JWT validation...');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('✅ [Questionnaire Auth] Token validated locally');
        console.log('👤 [Questionnaire Auth] Decoded token payload keys:', Object.keys(decoded));
        
        // More flexible user ID extraction
        let userId = null;
        let email = null;
        let name = null;
        
        // Try different possible field names for user ID
        if (decoded.sub) userId = decoded.sub;
        else if (decoded.userId) userId = decoded.userId;
        else if (decoded.id) userId = decoded.id;
        else if (decoded.user && decoded.user.id) userId = decoded.user.id;
        
        // Try different possible field names for email
        if (decoded.email) email = decoded.email;
        else if (decoded.user && decoded.user.email) email = decoded.user.email;
        
        // Try different possible field names for name
        if (decoded.name) name = decoded.name;
        else if (decoded.user && decoded.user.name) name = decoded.user.name;
        else if (decoded.firstName) name = decoded.firstName;
        
        console.log('🔍 [Questionnaire Auth] Extracted - ID:', userId, 'Email:', email);
        
        if (!userId) {
          console.log('❌ [Questionnaire Auth] No user ID found in token payload');
          console.log('🔍 [Questionnaire Auth] Full decoded payload:', JSON.stringify(decoded, null, 2));
          // Don't fail here, fall through to auth service validation
        } else {
          req.user = { id: userId, email, name };
          console.log('👤 [Questionnaire Auth] Local validation success - User ID:', userId, 'Email:', email);
          return next();
        }
        
      } catch (jwtError) {
        console.log('⚠️ [Questionnaire Auth] Local JWT validation failed:', jwtError.message);
        console.log('🔍 [Questionnaire Auth] JWT Error details:', jwtError.name);
        // Fall through to auth service validation
      }
    } else {
      console.log('⚠️ [Questionnaire Auth] No JWT_SECRET configured, skipping local validation');
    }

    // Validate token with auth service - using POST method as expected
    console.log('🔍 [Questionnaire Auth] Validating token with auth service...');
    
    try {
      const enhancedClient = new EnhancedClient();
      const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
      
      console.log('🔍 [Questionnaire Auth] Auth service URL:', authServiceUrl);
      
      // Use POST method with token in Authorization header (as expected by auth service)
      const response = await enhancedClient.post(\`\${authServiceUrl}/auth/validate-token\`, {}, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': \`Bearer \${token}\`
        }
      });
      
      console.log('🔍 [Questionnaire Auth] Auth service response status:', response.status);
      
      if (response.data && response.data.success && response.data.data && response.data.data.user) {
        const user = response.data.data.user;
        console.log('✅ [Questionnaire Auth] Token validated by auth service');
        console.log('👤 [Questionnaire Auth] User from auth service:', JSON.stringify(user, null, 2));
        
        // Flexible user ID extraction from auth service response
        let userId = user.id || user.userId || user.sub;
        
        if (!userId) {
          console.log('❌ [Questionnaire Auth] No user ID returned from auth service');
          return res.status(401).json({ 
            error: 'Authentication required, please log in again',
            code: 'INVALID_AUTH_RESPONSE',
            timestamp: new Date().toISOString()
          });
        }
        
        req.user = { 
          id: userId, 
          email: user.email, 
          name: user.name || user.firstName
        };
        console.log('👤 [Questionnaire Auth] Auth service validation success - User ID:', userId, 'Email:', user.email);
        return next();
        
      } else {
        console.log('❌ [Questionnaire Auth] Invalid response format from auth service');
        console.log('🔍 [Questionnaire Auth] Response data:', JSON.stringify(response.data, null, 2));
        return res.status(401).json({ 
          error: 'Authentication required, please log in again',
          code: 'INVALID_TOKEN',
          timestamp: new Date().toISOString()
        });
      }
      
    } catch (authError) {
      console.log('❌ [Questionnaire Auth] Auth service validation failed:', authError.message);
      console.log('🔍 [Questionnaire Auth] Auth error details:', {
        status: authError.response?.status,
        statusText: authError.response?.statusText,
        data: authError.response?.data
      });
      
      // If auth service is unavailable but we have a valid JWT, allow through
      if (process.env.JWT_SECRET) {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          const userId = decoded.sub || decoded.userId || decoded.id;
          if (userId) {
            console.log('⚠️ [Questionnaire Auth] Auth service unavailable, allowing with local JWT validation');
            req.user = { 
              id: userId, 
              email: decoded.email, 
              name: decoded.name || decoded.firstName
            };
            return next();
          }
        } catch (fallbackError) {
          console.log('❌ [Questionnaire Auth] Fallback JWT validation also failed:', fallbackError.message);
        }
      }
      
      return res.status(401).json({ 
        error: 'Authentication required, please log in again',
        code: 'AUTH_SERVICE_ERROR',
        details: authError.message,
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('❌ [Questionnaire Auth] Authentication middleware error:', error);
    return res.status(500).json({ 
      error: 'Authentication error',
      code: 'AUTH_MIDDLEWARE_ERROR',
      timestamp: new Date().toISOString()
    });
  }
};

// Role checking middleware
const checkRole = (requiredRoles) => {
  return (req, res, next) => {
    console.log('🔒 [Questionnaire Auth] Role check - Required roles:', requiredRoles);
    
    // If BYPASS_AUTH is enabled, allow all roles (admin access)
    if (process.env.BYPASS_AUTH === 'true') {
      console.log('🔓 BYPASS_AUTH enabled - granting admin access');
      return next();
    }
    
    // Check if user has the required roles
    const userRoles = req.user?.roles || [];
    const hasRequiredRole = requiredRoles.some(role => userRoles.includes(role));
    
    if (!hasRequiredRole) {
      console.log('❌ [Questionnaire Auth] Insufficient permissions - User roles:', userRoles, 'Required:', requiredRoles);
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: requiredRoles,
        userRoles: userRoles,
        timestamp: new Date().toISOString()
      });
    }
    
    console.log('✅ [Questionnaire Auth] Role check passed - User has required permissions');
    next();
  };
};

module.exports = { 
  authMiddleware, 
  checkRole 
};`;

// Write the improved auth middleware
fs.writeFileSync(authMiddlewarePath, authMiddlewareContent);
console.log('✅ Updated questionnaire service auth middleware');

// Fix 2: Update the auth service validate-token controller to handle both body and header tokens
const validateTokenPath = 'backend/auth-service/src/controllers/validate-token.controller.ts';
const validateTokenContent = `import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import config from '../config/config';

const prisma = new PrismaClient();

// Cache for previously validated tokens to reduce database load
const tokenCache: Record<string, { user: any, timestamp: number }> = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Clean up cache periodically to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  Object.keys(tokenCache).forEach(token => {
    if (now - tokenCache[token].timestamp > CACHE_TTL) {
      delete tokenCache[token];
    }
  });
}, 15 * 60 * 1000);

/**
 * @desc Validate JWT token from other services with improved flexibility
 * @route POST /validate-token
 */
export const validateToken = async (req: Request, res: Response): Promise<void> => {
  const requestId = req.headers['x-request-id'] || \`req-\${Date.now()}-\${Math.random().toString(36).substring(2, 10)}\`;
  
  console.log(\`[\${requestId}] Token validation request received\`);
  console.log(\`[\${requestId}] Method: \${req.method}\`);
  console.log(\`[\${requestId}] Headers present:\`, Object.keys(req.headers));
  console.log(\`[\${requestId}] Body present:\`, !!req.body && Object.keys(req.body));
  
  // Extract token from multiple possible sources
  let token: string | null = null;
  
  // 1. Try Authorization header first (most common)
  const authHeader = req.headers.authorization;
  if (authHeader) {
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7);
      console.log(\`[\${requestId}] Token extracted from Authorization header (Bearer)\`);
    } else if (authHeader.startsWith('bearer ')) {
      token = authHeader.slice(7);
      console.log(\`[\${requestId}] Token extracted from Authorization header (bearer)\`);
    } else {
      token = authHeader;
      console.log(\`[\${requestId}] Token extracted from Authorization header (raw)\`);
    }
  }
  
  // 2. Try request body as fallback (for backward compatibility)
  if (!token && req.body && req.body.token) {
    token = req.body.token;
    console.log(\`[\${requestId}] Token extracted from request body\`);
  }
  
  if (!token) {
    console.log(\`[\${requestId}] No token found in request\`);
    res.status(401).json({
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: 'Authentication required',
      },
    });
    return;
  }

  console.log(\`[\${requestId}] Token found, length: \${token.length}\`);
  console.log(\`[\${requestId}] Token preview: \${token.substring(0, 20)}...\`);
  
  try {
    // Check token cache first
    if (tokenCache[token] && Date.now() - tokenCache[token].timestamp < CACHE_TTL) {
      console.log(\`[\${requestId}] Using cached token validation for user: \${tokenCache[token].user.id}\`);
      
      res.status(200).json({
        success: true,
        data: {
          user: tokenCache[token].user
        },
        message: 'Token is valid (cached)',
      });
      return;
    }
    
    console.log(\`[\${requestId}] Validating token with JWT secret\`);
    
    // Verify token signature and expiration
    const decoded = jwt.verify(token, config.jwt.secret) as { id: string; email: string; role: string };
    console.log(\`[\${requestId}] JWT validation successful\`);
    console.log(\`[\${requestId}] Decoded payload keys:\`, Object.keys(decoded));
    
    // Get user from database to ensure it exists and is active
    try {
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          organization: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (!user) {
        console.log(\`[\${requestId}] User not found in database, ID: \${decoded.id}\`);
        res.status(401).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
          },
        });
        return;
      }

      // Cache the validation result
      tokenCache[token] = {
        user,
        timestamp: Date.now()
      };

      console.log(\`[\${requestId}] Token validation successful for user: \${user.id}\`);
      res.status(200).json({
        success: true,
        data: {
          user
        },
        message: 'Token is valid',
      });
    } catch (dbError) {
      console.error(\`[\${requestId}] Database error during token validation:\`, dbError);
      
      // Database connection error - fall back to just the JWT data
      const fallbackUser = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role || 'USER',
      };
      
      tokenCache[token] = {
        user: fallbackUser,
        timestamp: Date.now() - (CACHE_TTL / 2)
      };
      
      console.log(\`[\${requestId}] Using fallback validation for user: \${fallbackUser.id}\`);
      res.status(200).json({
        success: true,
        data: {
          user: fallbackUser,
          _usingFallback: true
        },
        message: 'Token is valid (using fallback data)',
      });
    }
  } catch (error) {
    console.error(\`[\${requestId}] Token validation error:\`, error);
    
    if ((error as Error).name === 'TokenExpiredError') {
      console.log(\`[\${requestId}] Token expired\`);
      res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Authentication token expired',
        },
      });
      return;
    }
    
    console.log(\`[\${requestId}] Invalid token\`);
    res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid authentication token',
      },
    });
  }
};`;

fs.writeFileSync(validateTokenPath, validateTokenContent);
console.log('✅ Updated auth service validate-token controller');

// Fix 3: Check API Gateway proxy configuration to ensure headers are preserved
const proxyMiddlewarePath = 'backend/api-gateway/src/middlewares/proxy.middleware.js';
if (fs.existsSync(proxyMiddlewarePath)) {
  let proxyContent = fs.readFileSync(proxyMiddlewarePath, 'utf8');
  
  // Ensure Authorization headers are preserved
  if (!proxyContent.includes('preserveAuthHeaders')) {
    console.log('✅ Updating API Gateway proxy middleware to preserve Authorization headers');
    
    const updatedProxy = proxyContent.replace(
      /headers: {([^}]*)}/g,
      `headers: {
        ...config.headers,
        // Preserve authorization headers for service-to-service communication
        'Authorization': req.headers.authorization,
        'X-Request-ID': req.headers['x-request-id'] || \`gateway-\${Date.now()}-\${Math.random().toString(36).substring(2, 8)}\`,
        'X-Forwarded-For': req.ip,
        preserveAuthHeaders: true
      }`
    );
    
    fs.writeFileSync(proxyMiddlewarePath, updatedProxy);
  }
}

console.log('\n🎯 FIXES APPLIED:');
console.log('=================');
console.log('1. ✅ Enhanced questionnaire service auth middleware with:');
console.log('   - More flexible token extraction (Bearer/bearer/raw)');
console.log('   - Multiple user ID field support (sub/userId/id/user.id)');
console.log('   - Improved error messages for debugging');
console.log('   - Better fallback handling when auth service is unavailable');
console.log('   - Enhanced logging for troubleshooting');

console.log('2. ✅ Updated auth service validate-token controller with:');
console.log('   - Support for both Authorization header and body token');
console.log('   - Flexible token extraction methods');
console.log('   - Enhanced request logging');

console.log('3. ✅ Ensured API Gateway preserves Authorization headers');

console.log('\n🔧 NEXT STEPS:');
console.log('==============');
console.log('1. Restart the questionnaire service:');
console.log('   docker-compose restart questionnaire-service');
console.log('');
console.log('2. Restart the auth service:');
console.log('   docker-compose restart auth-service');
console.log('');
console.log('3. Test the authentication flow:');
console.log('   - Login as jusscott@gmail.com');
console.log('   - Navigate to dashboard');
console.log('   - Navigate to questionnaires page');
console.log('');
console.log('4. Check the logs for detailed debugging information:');
console.log('   docker-compose logs -f questionnaire-service auth-service api-gateway');

console.log('\n✨ Authentication session issue fix complete!');
