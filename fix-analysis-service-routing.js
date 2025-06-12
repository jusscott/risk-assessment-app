#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing Analysis Service Routing in API Gateway');
console.log('=' .repeat(50));

const apiGatewayIndexPath = path.join(__dirname, 'backend/api-gateway/src/index.js');

try {
  console.log('1. Reading API Gateway index.js file...');
  let content = fs.readFileSync(apiGatewayIndexPath, 'utf8');
  
  console.log('2. Identifying the routing issue...');
  console.log('   - The API Gateway is intercepting /api/analysis/health before it reaches the proxy');
  console.log('   - This prevents proper routing to the analysis service');
  
  console.log('3. Applying fix...');
  
  // Remove the specific health route registration for analysis service
  // This line causes the API Gateway to serve its own health check instead of proxying
  const originalLine = "app.use('/api/analysis/health', healthLimiter, healthRoutes);";
  
  if (content.includes(originalLine)) {
    content = content.replace(originalLine, '// Analysis service health handled by proxy below');
    console.log('   ✅ Removed intercepting health route for analysis service');
  } else {
    console.log('   ⚠️  Original intercepting line not found - may already be fixed');
  }
  
  // Ensure the analysis service proxy is properly configured
  const proxyLine = "app.use('/api/analysis', checkSessionInactivity, verifyToken, analysisLimiter, analysisCache, analysisServiceProxy);";
  
  if (content.includes(proxyLine)) {
    console.log('   ✅ Analysis service proxy configuration found');
  } else {
    console.log('   ❌ Analysis service proxy configuration missing');
    return;
  }
  
  console.log('4. Writing updated configuration...');
  fs.writeFileSync(apiGatewayIndexPath, content);
  
  console.log('5. Fix applied successfully!');
  console.log('   - /api/analysis/health will now be proxied to the analysis service');
  console.log('   - Analysis service will handle its own health endpoints');
  console.log('   - API Gateway will no longer intercept analysis service health checks');
  
  console.log('\n6. Restart the API Gateway to apply changes:');
  console.log('   docker-compose restart api-gateway');
  
} catch (error) {
  console.error('❌ Error applying fix:', error.message);
}
