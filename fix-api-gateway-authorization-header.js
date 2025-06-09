#!/usr/bin/env node

/**
 * Fix API Gateway Authorization Header Forwarding Issue
 * 
 * The issue is that the authorization header is not being forwarded 
 * to the questionnaire service for submission endpoints, even though
 * the proxy middleware appears to have the correct code.
 */

const fs = require('fs');
const path = require('path');

async function fixAuthorizationHeaderForwarding() {
  console.log('🔧 FIXING API GATEWAY AUTHORIZATION HEADER FORWARDING');
  console.log('=' .repeat(60));
  
  const proxyMiddlewarePath = path.join(__dirname, 'backend/api-gateway/src/middlewares/proxy.middleware.js');
  
  if (!fs.existsSync(proxyMiddlewarePath)) {
    console.error('❌ Proxy middleware file not found:', proxyMiddlewarePath);
    return false;
  }
  
  console.log('📖 Reading current proxy middleware...');
  let content = fs.readFileSync(proxyMiddlewarePath, 'utf8');
  
  console.log('🔍 Issue Analysis:');
  console.log('- Templates endpoint works (no verifyToken middleware)');
  console.log('- Submissions endpoints fail (has verifyToken middleware)');
  console.log('- Authorization header missing in questionnaire service');
  console.log('- x-user-id and x-user-role headers are present');
  console.log('- Suggests proxy is working but authorization header is stripped');
  
  // The fix: Enhance the onProxyReq function to be more explicit about authorization header forwarding
  const enhancedOnProxyReq = `    onProxyReq: (proxyReq, req, res) => {
      // Add request tracking headers
      const requestId = req.headers['x-request-id'] || \`req-\${Date.now()}-\${Math.random().toString(36).substring(2, 10)}\`;
      proxyReq.setHeader('x-request-id', requestId);
      
      // CRITICAL FIX: Explicitly handle Authorization header forwarding with enhanced debugging
      const authHeader = req.headers.authorization || req.get('Authorization') || req.get('authorization');
      if (authHeader) {
        // Force set the authorization header with multiple approaches
        proxyReq.setHeader('Authorization', authHeader);
        proxyReq.setHeader('authorization', authHeader); // Lowercase version as backup
        
        // Extract token for logging (just the first part to avoid logging full tokens)
        const token = authHeader.split(' ')[1] || '';
        const tokenPrefix = token.substring(0, 10) + '...';
        
        logger.debug(\`🔐 EXPLICITLY forwarding authorization header to \${serviceName}\`, { 
          requestId, 
          service: serviceName,
          tokenPrefix,
          headerPresent: true,
          originalPath: req.originalUrl,
          method: req.method
        });
        
        // Additional debug for submission endpoints
        if (req.originalUrl.includes('/submissions/')) {
          logger.info(\`🎯 SUBMISSION REQUEST - Authorization header forwarded to \${serviceName}\`, {
            requestId,
            path: req.originalUrl,
            method: req.method,
            tokenPrefix,
            allHeaders: Object.keys(req.headers)
          });
        }
      } else {
        logger.warn(\`❌ NO authorization header found for \${serviceName}\`, { 
          requestId, 
          service: serviceName,
          originalPath: req.originalUrl,
          method: req.method,
          availableHeaders: Object.keys(req.headers),
          hasUser: !!req.user
        });
        
        // For submission endpoints, this is critical
        if (req.originalUrl.includes('/submissions/')) {
          logger.error(\`🚨 CRITICAL: Submission request missing authorization header!\`, {
            requestId,
            path: req.originalUrl,
            method: req.method,
            hasUser: !!req.user,
            userHeaders: {
              'x-user-id': req.user ? req.user.id : 'none',
              'x-user-role': req.user ? req.user.role : 'none'
            }
          });
        }
      }
      
      // Add user context if available
      if (req.user) {
        proxyReq.setHeader('x-user-id', req.user.id);
        proxyReq.setHeader('x-user-role', req.user.role);
        
        // Track original session across service boundaries
        if (req.sessionID) {
          proxyReq.setHeader('x-session-id', req.sessionID);
        }
        
        // Special handling for auth service endpoints that need req.user
        // This will help with /me endpoint and others that expect req.user
        if (serviceName === 'auth-service' && (req.path.includes('/me') || req.path === '/')) {
          // Pass the complete user object as a special header
          proxyReq.setHeader('x-auth-user-data', JSON.stringify(req.user));
        }
      }
      
      // Support service-to-service communication with token propagation
      // This helps maintain the user's session context across service boundaries
      if (req.headers['x-service-name']) {
        proxyReq.setHeader('x-service-name', req.headers['x-service-name']);
        logger.debug(\`Service-to-service request from \${req.headers['x-service-name']} to \${serviceName}\`, {
          requestId,
          fromService: req.headers['x-service-name'],
          toService: serviceName
        });
      } else {
        // Mark this request as originating from the API gateway
        proxyReq.setHeader('x-service-name', 'api-gateway');
      }
      
      // Ensure request body is correctly passed to the proxied request
      if (req.body && Object.keys(req.body).length > 0) {
        const bodyData = JSON.stringify(req.body);
        // Update headers
        proxyReq.setHeader('Content-Type', 'application/json');
        proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
        // Write body to request
        proxyReq.write(bodyData);
      }
      
      // Log the request with enhanced debugging
      logger.debug(\`Proxying request to \${serviceName}: \${req.method} \${req.path}\`, {
        requestId,
        userId: req.user ? req.user.id : 'unauthenticated',
        service: serviceName,
        hasAuthHeader: !!authHeader,
        isSubmissionRequest: req.originalUrl.includes('/submissions/')
      });
    },`;

  // Replace the existing onProxyReq section
  const onProxyReqRegex = /onProxyReq: \(proxyReq, req, res\) => \{[\s\S]*?\},\s*onProxyRes:/;
  
  if (onProxyReqRegex.test(content)) {
    content = content.replace(onProxyReqRegex, enhancedOnProxyReq + '\n    onProxyRes:');
    console.log('✅ Enhanced onProxyReq function with explicit authorization header handling');
  } else {
    console.error('❌ Could not find onProxyReq function to replace');
    return false;
  }
  
  console.log('💾 Writing enhanced proxy middleware...');
  fs.writeFileSync(proxyMiddlewarePath, content);
  
  console.log('🔄 Restarting API Gateway...');
  const { exec } = require('child_process');
  
  return new Promise((resolve) => {
    exec('cd risk-assessment-app && docker-compose restart api-gateway', (error, stdout, stderr) => {
      if (error) {
        console.error('❌ Failed to restart API Gateway:', error.message);
        resolve(false);
        return;
      }
      
      console.log('✅ API Gateway restarted successfully');
      console.log('📊 Service output:', stdout);
      
      // Wait a moment for service to fully start
      setTimeout(() => {
        console.log('\n🧪 TESTING THE FIX');
        console.log('=' .repeat(30));
        console.log('Please test the questionnaires page now.');
        console.log('The authorization header should now be properly forwarded.');
        
        console.log('\n📋 CHANGES MADE:');
        console.log('1. Enhanced authorization header forwarding with multiple approaches');
        console.log('2. Added explicit header checking with case-insensitive lookup');
        console.log('3. Enhanced logging for submission endpoints');
        console.log('4. Added critical error logging when auth header is missing');
        console.log('5. Improved debugging information for troubleshooting');
        
        console.log('\n🔍 NEXT STEPS:');
        console.log('1. Test the questionnaires page submissions');
        console.log('2. Check API Gateway logs for detailed header forwarding info');
        console.log('3. Verify questionnaire service receives authorization header');
        
        resolve(true);
      }, 5000);
    });
  });
}

// Run the fix
if (require.main === module) {
  fixAuthorizationHeaderForwarding().then(success => {
    if (success) {
      console.log('✅ Fix completed successfully');
      process.exit(0);
    } else {
      console.log('❌ Fix failed');
      process.exit(1);
    }
  }).catch(console.error);
}

module.exports = { fixAuthorizationHeaderForwarding };
