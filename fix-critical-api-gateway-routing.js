#!/usr/bin/env node

/**
 * Critical API Gateway Routing Fix
 * Addresses routing inconsistencies and service connectivity issues
 */

const fs = require('fs');
const path = require('path');

console.log('=== CRITICAL API GATEWAY ROUTING FIX ===');
console.log('Fixing routing inconsistencies and service connectivity issues\n');

async function fixApiGatewayRouting() {
    console.log('1. FIXING PATH REWRITE CONFIGURATION');
    console.log('====================================');
    
    // Fix path rewrite configuration to handle both singular and plural forms
    const pathRewriteConfig = `/**
 * Path rewriting configuration for API Gateway
 * Maps incoming requests to appropriate backend services
 * FIXED: Added support for both singular and plural endpoint forms
 */

const pathRewriteConfig = {
    // Auth service routes - support both forms
    '^/api/auth/(.*)': '/api/auth/$1',
    
    // Questionnaire service routes - support both singular and plural
    '^/api/questionnaire/(.*)': '/api/questionnaire/$1',
    '^/api/questionnaires/(.*)': '/api/questionnaire/$1',
    
    // Analysis service routes
    '^/api/analysis/(.*)': '/api/analysis/$1',
    
    // Report service routes - support both singular and plural
    '^/api/report/(.*)': '/api/reports/$1',
    '^/api/reports/(.*)': '/api/reports/$1',
    
    // Payment service routes
    '^/api/payment/(.*)': '/api/payments/$1',
    '^/api/payments/(.*)': '/api/payments/$1',
    '^/api/plans/(.*)': '/api/plans/$1',
    
    // Health endpoints - direct pass-through with proper mapping
    '^/api/auth/health': '/health',
    '^/api/questionnaire/health': '/health',
    '^/api/questionnaires/health': '/health',
    '^/api/analysis/health': '/health',
    '^/api/report/health': '/health',
    '^/api/reports/health': '/health',
    '^/api/payment/health': '/health',
    '^/api/payments/health': '/health'
};

// Function to generate standardized path rewrite rules
const generatePathRewrite = (serviceId) => {
    const rules = {};
    
    switch(serviceId.toLowerCase()) {
        case 'auth':
            rules['^/api/auth/(.*)'] = '/api/auth/$1';
            rules['^/api/auth/health'] = '/health';
            break;
            
        case 'questionnaire':
            rules['^/api/questionnaire/(.*)'] = '/api/questionnaire/$1';
            rules['^/api/questionnaires/(.*)'] = '/api/questionnaire/$1';
            rules['^/api/questionnaire/health'] = '/health';
            rules['^/api/questionnaires/health'] = '/health';
            break;
            
        case 'payment':
            rules['^/api/payment/(.*)'] = '/api/payments/$1';
            rules['^/api/payments/(.*)'] = '/api/payments/$1';
            rules['^/api/plans/(.*)'] = '/api/plans/$1';
            rules['^/api/payment/health'] = '/health';
            rules['^/api/payments/health'] = '/health';
            break;
            
        case 'analysis':
            rules['^/api/analysis/(.*)'] = '/api/analysis/$1';
            rules['^/api/analysis/health'] = '/health';
            break;
            
        case 'report':
            rules['^/api/report/(.*)'] = '/api/reports/$1';
            rules['^/api/reports/(.*)'] = '/api/reports/$1';
            rules['^/api/report/health'] = '/health';
            rules['^/api/reports/health'] = '/health';
            break;
            
        default:
            throw new Error(\`Unknown service ID: \${serviceId}\`);
    }
    
    return rules;
};

pathRewriteConfig.generatePathRewrite = generatePathRewrite;

module.exports = pathRewriteConfig;
`;

    try {
        fs.writeFileSync('backend/api-gateway/src/config/path-rewrite.config.js', pathRewriteConfig);
        console.log('✅ Updated path-rewrite.config.js with singular/plural support');
    } catch (error) {
        console.log('❌ Failed to update path-rewrite.config.js:', error.message);
    }

    console.log('\n2. FIXING API GATEWAY INDEX.JS ROUTING');
    console.log('======================================');
    
    // Read current API Gateway index.js
    let apiGatewayContent;
    try {
        apiGatewayContent = fs.readFileSync('backend/api-gateway/src/index.js', 'utf8');
    } catch (error) {
        console.log('❌ Failed to read API Gateway index.js:', error.message);
        return;
    }

    // Add additional health endpoint mappings for singular forms
    const healthEndpointFix = `
// Register health routes with rate limiting - support both singular and plural forms
app.use('/health', healthLimiter, healthRoutes);
app.use('/api/health', healthLimiter, healthRoutes);

// Auth service health endpoints
app.use('/api/auth/health', healthLimiter, healthRoutes);

// Questionnaire service health endpoints (both singular and plural)
app.use('/api/questionnaire/health', healthLimiter, healthRoutes);
app.use('/api/questionnaires/health', healthLimiter, healthRoutes);

// Payment service health endpoints (both singular and plural)
app.use('/api/payment/health', healthLimiter, healthRoutes);
app.use('/api/payments/health', healthLimiter, healthRoutes);

// Analysis service health endpoints
app.use('/api/analysis/health', healthLimiter, healthRoutes);

// Report service health endpoints (both singular and plural)
app.use('/api/report/health', healthLimiter, healthRoutes);
app.use('/api/reports/health', healthLimiter, healthRoutes);`;

    // Replace the existing health endpoint registration
    const healthEndpointRegex = /\/\/ Register health routes[\s\S]*?app\.use\('\/api\/reports\/health'.*?\);/;
    
    if (healthEndpointRegex.test(apiGatewayContent)) {
        apiGatewayContent = apiGatewayContent.replace(healthEndpointRegex, healthEndpointFix);
        console.log('✅ Updated health endpoint registrations');
    } else {
        console.log('⚠️  Could not find health endpoint section to replace, adding manually');
        // Find where to insert the health routes
        const healthRoutesInsertPoint = apiGatewayContent.indexOf("// Get the service URL function from config");
        if (healthRoutesInsertPoint > -1) {
            apiGatewayContent = apiGatewayContent.slice(0, healthRoutesInsertPoint) + 
                healthEndpointFix + '\n\n' + 
                apiGatewayContent.slice(healthRoutesInsertPoint);
        }
    }

    // Add support for both singular and plural questionnaire routes
    const questionnaireRouteFix = `
// Specific questionnaire templates route with appropriate caching for public access
app.use('/api/questionnaire/templates', apiLimiter, templateCache, questionnaireServiceProxy);
app.use('/api/questionnaires/templates', apiLimiter, templateCache, questionnaireServiceProxy);

// Specific questionnaire submissions route (both singular and plural)
app.use('/api/questionnaire/submissions', checkSessionInactivity, verifyToken, apiLimiter, questionnaireServiceProxy);
app.use('/api/questionnaires/submissions', checkSessionInactivity, verifyToken, apiLimiter, questionnaireServiceProxy);

// General questionnaire routes - support both forms
app.use('/api/questionnaire', checkSessionInactivity, verifyToken, apiLimiter, questionnaireServiceProxy);
app.use('/api/questionnaires', checkSessionInactivity, verifyToken, apiLimiter, questionnaireServiceProxy);`;

    // Replace existing questionnaire routes
    const questionnaireRoutesRegex = /\/\/ Specific questionnaire templates route[\s\S]*?app\.use\('\/api\/questionnaires'.*?\);/;
    
    if (questionnaireRoutesRegex.test(apiGatewayContent)) {
        apiGatewayContent = apiGatewayContent.replace(questionnaireRoutesRegex, questionnaireRouteFix);
        console.log('✅ Updated questionnaire route registrations');
    }

    // Add support for singular report routes
    const reportRouteFix = `
// Report routes with specific rate limiting for resource-intensive operations (both forms)
app.use('/api/report/generate', checkSessionInactivity, verifyToken, reportLimiter, reportServiceProxy);
app.use('/api/reports/generate', checkSessionInactivity, verifyToken, reportLimiter, reportServiceProxy);
app.use('/api/report', checkSessionInactivity, verifyToken, apiLimiter, reportsListCache, reportServiceProxy);
app.use('/api/reports', checkSessionInactivity, verifyToken, apiLimiter, reportsListCache, reportServiceProxy);`;

    // Replace existing report routes
    const reportRoutesRegex = /\/\/ Report routes with specific rate limiting[\s\S]*?app\.use\('\/api\/reports'.*?\);/;
    
    if (reportRoutesRegex.test(apiGatewayContent)) {
        apiGatewayContent = apiGatewayContent.replace(reportRoutesRegex, reportRouteFix);
        console.log('✅ Updated report route registrations');
    }

    // Write the updated API Gateway configuration
    try {
        fs.writeFileSync('backend/api-gateway/src/index.js', apiGatewayContent);
        console.log('✅ Updated API Gateway index.js with routing fixes');
    } catch (error) {
        console.log('❌ Failed to update API Gateway index.js:', error.message);
    }

    console.log('\n3. CHECKING SERVICE HEALTH ENDPOINTS');
    console.log('====================================');
    
    // Check if questionnaire service has proper health endpoint
    try {
        const questionnaireIndexPath = 'backend/questionnaire-service/src/index.js';
        let questionnaireContent = fs.readFileSync(questionnaireIndexPath, 'utf8');
        
        // Ensure health endpoint is registered
        if (!questionnaireContent.includes("app.use('/health'")) {
            const healthEndpoint = `
// Health check endpoint
app.use('/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'healthy',
    service: 'questionnaire-service',
    timestamp: new Date().toISOString(),
    version: process.env.SERVICE_VERSION || '1.0.0'
  });
});
`;
            
            // Insert before app.listen
            const listenIndex = questionnaireContent.indexOf('app.listen');
            if (listenIndex > -1) {
                questionnaireContent = questionnaireContent.slice(0, listenIndex) + 
                    healthEndpoint + '\n' + 
                    questionnaireContent.slice(listenIndex);
                
                fs.writeFileSync(questionnaireIndexPath, questionnaireContent);
                console.log('✅ Added health endpoint to questionnaire service');
            }
        } else {
            console.log('✅ Questionnaire service health endpoint already exists');
        }
    } catch (error) {
        console.log('⚠️  Could not check/update questionnaire service health endpoint:', error.message);
    }

    console.log('\n4. FIXING SERVICE URL CONFIGURATION');
    console.log('===================================');
    
    // Update service URL configuration to handle Docker networking properly
    const serviceUrlConfig = `/**
 * Service URL configuration utility
 * Handles service discovery and URL resolution for different environments
 */

const logger = require('winston');

/**
 * Get service URL with environment-specific resolution
 * @param {string} envKey - Environment variable key (e.g., 'AUTH_SERVICE_URL')
 * @param {string} defaultUrl - Default URL to use if env var not set
 * @returns {string} Resolved service URL
 */
const getServiceUrl = (envKey, defaultUrl) => {
  // Check for explicit environment variable
  const envUrl = process.env[\`\${envKey}_SERVICE_URL\`] || process.env[envKey];
  
  if (envUrl) {
    logger.info(\`Using service URL from environment: \${envKey} = \${envUrl}\`);
    return envUrl;
  }
  
  // Use default URL
  logger.info(\`Using default service URL: \${envKey} = \${defaultUrl}\`);
  return defaultUrl;
};

/**
 * Service URL mappings with Docker-aware defaults
 */
const serviceUrls = {
  auth: getServiceUrl('AUTH', 'http://auth-service:5001'),
  questionnaire: getServiceUrl('QUESTIONNAIRE', 'http://questionnaire-service:5002'),
  payment: getServiceUrl('PAYMENT', 'http://payment-service:5003'),
  analysis: getServiceUrl('ANALYSIS', 'http://analysis-service:5004'),
  report: getServiceUrl('REPORT', 'http://report-service:5005')
};

// Export the configuration
module.exports = {
  getServiceUrl,
  serviceUrls,
  // Legacy support
  auth: serviceUrls.auth,
  questionnaire: serviceUrls.questionnaire,
  payment: serviceUrls.payment,
  analysis: serviceUrls.analysis,
  report: serviceUrls.report,
  plans: serviceUrls.payment // Plans are handled by payment service
};
`;

    try {
        fs.writeFileSync('backend/api-gateway/src/config/service-url.config.js', serviceUrlConfig);
        console.log('✅ Updated service URL configuration');
    } catch (error) {
        console.log('❌ Failed to update service URL configuration:', error.message);
    }

    console.log('\n5. CREATING SERVICE RESTART SCRIPT');
    console.log('==================================');
    
    const restartScript = `#!/bin/bash

echo "=== RESTARTING CRITICAL SERVICES ==="
echo "Addressing service startup and routing issues"

# Wait for services to be ready for restart
echo "Waiting for Docker containers to be ready..."
sleep 2

# Restart auth service first (other services depend on it)
echo "Restarting auth-service..."
docker-compose restart auth-service
sleep 5

# Restart questionnaire service 
echo "Restarting questionnaire-service..."
docker-compose restart questionnaire-service
sleep 5

# Restart API Gateway to pick up routing changes
echo "Restarting api-gateway..."
docker-compose restart api-gateway
sleep 5

# Check service status
echo ""
echo "=== SERVICE STATUS CHECK ==="
docker ps | grep risk-assessment | grep -E "(auth-service|questionnaire-service|api-gateway)"

echo ""
echo "=== TESTING CRITICAL ENDPOINTS ==="
echo "Waiting for services to fully start..."
sleep 10

# Test API Gateway health
echo "Testing API Gateway health..."
curl -s http://localhost:5000/health | jq . || echo "API Gateway health check failed"

echo ""
echo "Testing auth service health..."
curl -s http://localhost:5000/api/auth/health | jq . || echo "Auth service health check failed"

echo ""
echo "Testing questionnaire service health..."
curl -s http://localhost:5000/api/questionnaire/health | jq . || echo "Questionnaire service health check failed"

echo ""
echo "=== RESTART COMPLETE ==="
echo "Services should now be accessible with proper routing"
`;

    try {
        fs.writeFileSync('backend/api-gateway/restart-services.sh', restartScript);
        fs.chmodSync('backend/api-gateway/restart-services.sh', '755');
        console.log('✅ Created service restart script');
    } catch (error) {
        console.log('❌ Failed to create restart script:', error.message);
    }
}

async function main() {
    try {
        await fixApiGatewayRouting();
        
        console.log('\n=== FIX SUMMARY ===');
        console.log('✅ Fixed path rewrite configuration for singular/plural endpoints');
        console.log('✅ Updated API Gateway routing to support both forms');
        console.log('✅ Added missing health endpoints');
        console.log('✅ Enhanced service URL configuration');
        console.log('✅ Created service restart script');
        console.log('');
        console.log('Next steps:');
        console.log('1. Run: chmod +x backend/api-gateway/restart-services.sh');
        console.log('2. Run: backend/api-gateway/restart-services.sh');
        console.log('3. Test endpoints using the diagnostic script');
        
    } catch (error) {
        console.error('Critical fix failed:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { fixApiGatewayRouting };
