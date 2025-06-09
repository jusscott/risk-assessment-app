const jwt = require('jsonwebtoken');
const enhancedClient = require('../utils/enhanced-client');

// Enhanced authentication middleware with improved token validation
const authMiddleware = async (req, res, next) => {
  try {
    const path = req.path || req.originalUrl || '/';
    const isSubmissionRequest = path.includes('/submission');
    
    console.log(`🔍 [Questionnaire Auth] Processing request to: ${path}`);
    console.log(`🔍 [Questionnaire Auth] Is submission request: ${isSubmissionRequest}`);
    console.log(`🔍 [Questionnaire Auth] Headers present: ${JSON.stringify(Object.keys(req.headers))}`);
    
    // Handle BYPASS_AUTH mode
    if (process.env.BYPASS_AUTH === 'true') {
      console.log('🔍 [Questionnaire Auth] BYPASS_AUTH enabled - using direct JWT validation');
      
      // Try JWT validation first (primary method)
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        console.log(`🔍 [Questionnaire Auth] Token extracted, length: ${token.length}`);
        
        try {
          const jwtSecret = process.env.JWT_SECRET || 'shared-security-risk-assessment-secret-key';
          const decoded = jwt.verify(token, jwtSecret);
          
          console.log('✅ [Questionnaire Auth] JWT validation successful');
          req.user = decoded;
          return next();
        } catch (error) {
          console.log(`❌ [Questionnaire Auth] Direct JWT validation failed: ${error.message}`);
          console.log(`🔍 [Questionnaire Auth] JWT Error type: ${error.name}`);
          console.log(`🔍 [Questionnaire Auth] Token preview: ${token.substring(0, 18)}...`);
          
          // Don't return error yet - try fallback method
        }
      } else {
        console.log('❌ [Questionnaire Auth] No valid authorization header');
      }
      
      // FALLBACK AUTHENTICATION: Use forwarded user headers from API Gateway
      const userId = req.headers['x-user-id'];
      const userRole = req.headers['x-user-role'];
      
      if (userId && userRole) {
        console.log(`✅ [Questionnaire Auth] Using fallback authentication with user ID: ${userId}`);
        
        // Create user object from forwarded headers
        req.user = {
          id: userId,
          role: userRole,
          email: 'authenticated-via-headers@system.local', // Placeholder
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 86400 // 24 hours
        };
        
        console.log('🎯 [Questionnaire Auth] Fallback authentication successful');
        return next();
      }
      
      // If both methods fail, return unauthorized
      console.log('❌ [Questionnaire Auth] Both JWT and fallback authentication failed');
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid authentication token'
        }
      });
    }

    // Standard authentication flow (when not in bypass mode)
    // Extract token from Authorization header
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
          
          // Special logging for submission requests
          if (isSubmissionRequest) {
            console.log('🎯 [Questionnaire Auth] Submission request authenticated successfully');
            console.log(`👤 [Questionnaire Auth] User for submission: ${JSON.stringify(req.user)}`);
          }
          
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

    // Validate token with auth service
    console.log('🔍 [Questionnaire Auth] Validating token with auth service...');
    
    try {
      console.log('🔍 [Questionnaire Auth] Using enhanced client for token validation');
      
      // Use the enhanced client's validateToken method
      const response = await enhancedClient.validateToken(token);
      
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
        
        // Special logging for submission requests
        if (isSubmissionRequest) {
          console.log('🎯 [Questionnaire Auth] Submission request authenticated successfully');
          console.log(`👤 [Questionnaire Auth] User for submission: ${JSON.stringify(req.user)}`);
        }
        
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
    console.log('� [Questionnaire Auth] Role check - Required roles:', requiredRoles);
    
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
};
