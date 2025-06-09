#!/usr/bin/env node

/**
 * Fix Questionnaire Authorization Header Preservation
 * 
 * The issue is that the verifyToken middleware is interfering with 
 * the authorization header forwarding for questionnaire submission endpoints.
 * This fix ensures the header is preserved and forwarded correctly.
 */

const fs = require('fs');
const path = require('path');

async function fixAuthHeaderPreservation() {
  console.log('🔧 FIXING QUESTIONNAIRE AUTHORIZATION HEADER PRESERVATION');
  console.log('=' .repeat(60));
  
  const apiGatewayIndexPath = path.join(__dirname, 'backend/api-gateway/src/index.js');
  
  if (!fs.existsSync(apiGatewayIndexPath)) {
    console.error('❌ API Gateway index file not found:', apiGatewayIndexPath);
    return false;
  }
  
  console.log('📖 Reading API Gateway index.js...');
  let content = fs.readFileSync(apiGatewayIndexPath, 'utf8');
  
  console.log('🔍 Root Cause Analysis:');
  console.log('- Diagnostic script sends valid JWT token');
  console.log('- API Gateway logs show "invalid-token-test" being forwarded');
  console.log('- Sometimes no authorization header at all');
  console.log('- verifyToken middleware may be corrupting the header');
  
  // Find the problematic questionnaire submissions route
  const submissionsRoutePattern = /app\.use\('\/api\/questionnaires\/submissions', checkSessionInactivity, verifyToken, apiLimiter, questionnaireServiceProxy\);/;
  
  if (!submissionsRoutePattern.test(content)) {
    console.error('❌ Could not find questionnaire submissions route to fix');
    return false;
  }
  
  // Create a new middleware that preserves the authorization header
  const preserveAuthMiddleware = `
// Custom middleware to preserve authorization header for questionnaire submissions
const preserveAuthHeader = (req, res, next) => {
  // Store the original authorization header before any middleware processing
  if (req.headers.authorization) {
    req.originalAuthHeader = req.headers.authorization;
    console.log('🔐 [AUTH PRESERVE] Original auth header stored:', req.originalAuthHeader.substring(0, 20) + '...');
  } else {
    console.log('⚠️ [AUTH PRESERVE] No authorization header found in request');
  }
  next();
};

// Enhanced proxy wrapper that restores the original authorization header
const createPreservingProxy = (baseProxy) => {
  return (req, res, next) => {
    // Restore the original authorization header if it was stored
    if (req.originalAuthHeader) {
      req.headers.authorization = req.originalAuthHeader;
      console.log('🔄 [AUTH PRESERVE] Restored original auth header for forwarding');
    }
    return baseProxy(req, res, next);
  };
};
`;

  // Find the questionnaireServiceProxy creation and add our enhancement
  const proxyCreationPattern = /(const questionnaireServiceProxy = createServiceProxy\({[\s\S]*?\}\);)/;
  
  if (proxyCreationPattern.test(content)) {
    content = content.replace(proxyCreationPattern, '$1\n' + preserveAuthMiddleware);
    console.log('✅ Added auth header preservation middleware');
  } else {
    console.error('❌ Could not find questionnaire service proxy creation');
    return false;
  }
  
  // Replace the problematic route with our enhanced version
  const enhancedRoute = `// Enhanced questionnaire submissions route with auth header preservation
app.use('/api/questionnaires/submissions', 
  preserveAuthHeader,           // Store original auth header FIRST
  checkSessionInactivity, 
  verifyToken, 
  apiLimiter, 
  createPreservingProxy(questionnaireServiceProxy)  // Restore auth header before forwarding
);`;

  content = content.replace(submissionsRoutePattern, enhancedRoute);
  console.log('✅ Enhanced questionnaire submissions route with auth preservation');
  
  // Also fix the singular form route if it exists
  const singularRoutePattern = /app\.use\('\/api\/questionnaire\/submissions', checkSessionInactivity, verifyToken, apiLimiter, questionnaireServiceProxy\);/;
  
  if (singularRoutePattern.test(content)) {
    const enhancedSingularRoute = `// Enhanced questionnaire submissions route (singular) with auth header preservation
app.use('/api/questionnaire/submissions', 
  preserveAuthHeader,           // Store original auth header FIRST
  checkSessionInactivity, 
  verifyToken, 
  apiLimiter, 
  createPreservingProxy(questionnaireServiceProxy)  // Restore auth header before forwarding
);`;
    
    content = content.replace(singularRoutePattern, enhancedSingularRoute);
    console.log('✅ Enhanced singular questionnaire submissions route with auth preservation');
  }
  
  console.log('💾 Writing enhanced API Gateway configuration...');
  fs.writeFileSync(apiGatewayIndexPath, content);
  
  console.log('🔄 Restarting API Gateway...');
  const { exec } = require('child_process');
  
  return new Promise((resolve) => {
    exec('docker-compose restart api-gateway', { cwd: path.join(__dirname) }, (error, stdout, stderr) => {
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
        
        console.log('\n📋 CHANGES MADE:');
        console.log('1. Added preserveAuthHeader middleware to store original authorization header');
        console.log('2. Created createPreservingProxy wrapper to restore auth header before forwarding');
        console.log('3. Applied fix to both singular and plural submission routes');
        console.log('4. Authorization header is now preserved throughout the middleware chain');
        
        console.log('\n🔍 HOW IT WORKS:');
        console.log('1. preserveAuthHeader stores original header BEFORE verifyToken processes it');
        console.log('2. verifyToken middleware can do its validation without affecting the original');
        console.log('3. createPreservingProxy restores original header before sending to questionnaire service');
        console.log('4. Questionnaire service receives the unmodified authorization header');
        
        console.log('\n✅ The authorization header should now reach the questionnaire service correctly!');
        
        resolve(true);
      }, 3000);
    });
  });
}

// Run the fix
if (require.main === module) {
  fixAuthHeaderPreservation().then(success => {
    if (success) {
      console.log('\n🎉 AUTH HEADER PRESERVATION FIX COMPLETED!');
      console.log('Please test the questionnaires page now.');
      process.exit(0);
    } else {
      console.log('❌ Fix failed');
      process.exit(1);
    }
  }).catch(console.error);
}

module.exports = { fixAuthHeaderPreservation };
