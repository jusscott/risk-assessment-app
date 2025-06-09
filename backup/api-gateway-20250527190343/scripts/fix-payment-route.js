#!/usr/bin/env node

/**
 * API Gateway Fix for Payment Service Routes
 * This script updates the API Gateway configuration to ensure proper routing
 * to the payment service, especially for the plans endpoint.
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  bold: '\x1b[1m'
};

console.log(`${colors.blue}${colors.bold}===== API GATEWAY PAYMENT ROUTE FIX =====${colors.reset}`);
console.log(`${colors.cyan}Ensuring proper route configuration for payment service${colors.reset}\n`);

// Paths
const apiGatewayRoot = path.resolve(__dirname, '..');
const serviceUrlConfigPath = path.join(apiGatewayRoot, 'src/config/service-url.config.js');
const pathRewriteConfigPath = path.join(apiGatewayRoot, 'src/config/path-rewrite.config.js');
const indexPath = path.join(apiGatewayRoot, 'src/index.js');

// Default values
const paymentServiceUrl = 'http://localhost:5003';

// Fix service-url.config.js
function fixServiceUrlConfig() {
  console.log(`${colors.cyan}[1/3] Checking service URL configuration...${colors.reset}`);
  
  if (!fs.existsSync(serviceUrlConfigPath)) {
    console.log(`${colors.yellow}⚠ service-url.config.js doesn't exist, creating it${colors.reset}`);
    
    const serviceUrlConfig = `/**
 * Service URL Configuration
 * Maps service names to their URLs
 */

module.exports = {
  auth: 'http://localhost:5001',
  questionnaire: 'http://localhost:5002',
  payment: '${paymentServiceUrl}',
  analysis: 'http://localhost:5004',
  report: 'http://localhost:5005'
};
`;
    
    try {
      // Ensure directory exists
      const configDir = path.dirname(serviceUrlConfigPath);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      
      fs.writeFileSync(serviceUrlConfigPath, serviceUrlConfig);
      console.log(`${colors.green}✓ Created service-url.config.js with payment service URL${colors.reset}`);
      return true;
    } catch (error) {
      console.error(`${colors.red}✗ Error creating service-url.config.js: ${error.message}${colors.reset}`);
      return false;
    }
  } else {
    console.log(`${colors.green}✓ service-url.config.js exists${colors.reset}`);
    
    try {
      let content = fs.readFileSync(serviceUrlConfigPath, 'utf8');
      
      if (content.includes('payment:') && content.includes('http://')) {
        console.log(`${colors.green}✓ Payment service URL already configured${colors.reset}`);
        
        // Extract the current URL
        const match = content.match(/payment['"]*:\s*['"]([^'"]+)['"]/);
        if (match && match[1]) {
          console.log(`${colors.cyan}  Current payment service URL: ${match[1]}${colors.reset}`);
        }
      } else {
        console.log(`${colors.yellow}⚠ Payment service URL not found in config, adding it${colors.reset}`);
        
        // If the file exists but doesn't have payment service, add it
        if (content.trim().endsWith(';')) {
          // Remove the closing semicolon and add payment service
          content = content.replace(/};(\s*)$/, `  payment: '${paymentServiceUrl}'\n};$1`);
        } else if (content.trim().endsWith('}')) {
          // Add payment service before closing bracket
          content = content.replace(/}(\s*)$/, `  payment: '${paymentServiceUrl}'\n}$1`);
        } else {
          // If file format is unexpected, append the config
          content += `\n\n// Added by fix-payment-route.js\nmodule.exports.payment = '${paymentServiceUrl}';\n`;
        }
        
        fs.writeFileSync(serviceUrlConfigPath, content);
        console.log(`${colors.green}✓ Added payment service URL to configuration${colors.reset}`);
      }
      
      return true;
    } catch (error) {
      console.error(`${colors.red}✗ Error updating service-url.config.js: ${error.message}${colors.reset}`);
      return false;
    }
  }
}

// Fix path-rewrite.config.js
function fixPathRewriteConfig() {
  console.log(`\n${colors.cyan}[2/3] Checking path rewrite configuration...${colors.reset}`);
  
  if (!fs.existsSync(pathRewriteConfigPath)) {
    console.log(`${colors.yellow}⚠ path-rewrite.config.js doesn't exist, creating it${colors.reset}`);
    
    const pathRewriteConfig = `/**
 * Path Rewrite Configuration
 * Maps endpoint paths to their respective services
 */

module.exports = {
  '/api/auth': 'auth',
  '/api/users': 'auth',
  '/api/questionnaires': 'questionnaire',
  '/api/submissions': 'questionnaire',
  '/api/templates': 'questionnaire',
  '/api/plans': 'payment',
  '/api/subscriptions': 'payment',
  '/api/payments': 'payment',
  '/api/invoices': 'payment',
  '/api/usage': 'payment',
  '/api/enterprise': 'payment',
  '/api/analysis': 'analysis',
  '/api/benchmarks': 'analysis',
  '/api/rules': 'analysis',
  '/api/reports': 'report',
  '/api/generation': 'report'
};
`;
    
    try {
      // Ensure directory exists
      const configDir = path.dirname(pathRewriteConfigPath);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      
      fs.writeFileSync(pathRewriteConfigPath, pathRewriteConfig);
      console.log(`${colors.green}✓ Created path-rewrite.config.js with payment routes${colors.reset}`);
      return true;
    } catch (error) {
      console.error(`${colors.red}✗ Error creating path-rewrite.config.js: ${error.message}${colors.reset}`);
      return false;
    }
  } else {
    console.log(`${colors.green}✓ path-rewrite.config.js exists${colors.reset}`);
    
    try {
      let content = fs.readFileSync(pathRewriteConfigPath, 'utf8');
      let updated = false;
      
      // Check for payment-related routes
      const paymentRoutes = [
        { path: '/api/plans', service: 'payment' },
        { path: '/api/subscriptions', service: 'payment' },
        { path: '/api/payments', service: 'payment' },
        { path: '/api/invoices', service: 'payment' },
        { path: '/api/usage', service: 'payment' },
        { path: '/api/enterprise', service: 'payment' }
      ];
      
      // Check if routes exist and add missing ones
      paymentRoutes.forEach(route => {
        if (!content.includes(`'${route.path}'`) && !content.includes(`"${route.path}"`)) {
          console.log(`${colors.yellow}⚠ Route ${route.path} not found, adding it${colors.reset}`);
          
          if (content.trim().endsWith(';')) {
            // Remove the closing semicolon and add the route
            content = content.replace(/};(\s*)$/, `  '${route.path}': '${route.service}'\n};$1`);
          } else if (content.trim().endsWith('}')) {
            // Add route before closing bracket
            content = content.replace(/}(\s*)$/, `  '${route.path}': '${route.service}'\n}$1`);
          } else {
            // If file format is unexpected, append the config
            content += `\n\n// Added by fix-payment-route.js\nmodule.exports['${route.path}'] = '${route.service}';\n`;
          }
          
          updated = true;
        }
      });
      
      if (updated) {
        fs.writeFileSync(pathRewriteConfigPath, content);
        console.log(`${colors.green}✓ Added missing payment routes to configuration${colors.reset}`);
      } else {
        console.log(`${colors.green}✓ All payment routes already properly configured${colors.reset}`);
      }
      
      return true;
    } catch (error) {
      console.error(`${colors.red}✗ Error updating path-rewrite.config.js: ${error.message}${colors.reset}`);
      return false;
    }
  }
}

// Fix index.js to ensure proxy middleware is properly set up
function fixIndexJs() {
  console.log(`\n${colors.cyan}[3/3] Checking API Gateway index.js...${colors.reset}`);
  
  if (!fs.existsSync(indexPath)) {
    console.log(`${colors.red}✗ index.js not found, cannot fix${colors.reset}`);
    console.log(`${colors.yellow}⚠ Please make sure API Gateway's index.js exists and contains proper proxy setup${colors.reset}`);
    return false;
  }
  
  try {
    const content = fs.readFileSync(indexPath, 'utf8');
    
    // Check if proxy middleware is imported and used
    const hasProxyImport = content.includes('proxy.middleware') || content.includes('proxyMiddleware');
    const hasProxyUse = content.includes('app.use') && 
                        (content.includes('proxy') || content.includes('Proxy'));
    
    if (hasProxyImport && hasProxyUse) {
      console.log(`${colors.green}✓ index.js appears to have proxy middleware properly configured${colors.reset}`);
      return true;
    } else {
      console.log(`${colors.yellow}⚠ index.js may not have proxy middleware properly configured${colors.reset}`);
      console.log(`${colors.yellow}⚠ Please review the API Gateway's index.js to ensure proxy middleware is set up${colors.reset}`);
      
      // We don't want to modify the index.js automatically as it might be complex
      console.log(`${colors.yellow}Sample proxy middleware setup:${colors.reset}`);
      console.log(`${colors.cyan}const { proxyMiddleware } = require('./middlewares/proxy.middleware');${colors.reset}`);
      console.log(`${colors.cyan}app.use(proxyMiddleware);${colors.reset}`);
      
      return false;
    }
  } catch (error) {
    console.error(`${colors.red}✗ Error checking index.js: ${error.message}${colors.reset}`);
    return false;
  }
}

// Create the proxy middleware if it doesn't exist
function createProxyMiddleware() {
  console.log(`\n${colors.cyan}[Bonus] Checking proxy middleware...${colors.reset}`);
  
  const proxyMiddlewarePath = path.join(apiGatewayRoot, 'src/middlewares/proxy.middleware.js');
  
  if (fs.existsSync(proxyMiddlewarePath)) {
    console.log(`${colors.green}✓ proxy.middleware.js exists${colors.reset}`);
    return true;
  }
  
  console.log(`${colors.yellow}⚠ proxy.middleware.js doesn't exist, creating it${colors.reset}`);
  
  const proxyMiddleware = `/**
 * Proxy Middleware
 * Forwards requests to the appropriate service based on path
 */

const { createProxyMiddleware } = require('http-proxy-middleware');
const serviceUrls = require('../config/service-url.config');
const pathMappings = require('../config/path-rewrite.config');

/**
 * Determines which service a request should be routed to based on its path
 * @param {string} path - The request path
 * @returns {string|null} - The service name or null if no match
 */
function getServiceForPath(path) {
  // Find the longest matching path prefix
  let matchedPrefix = null;
  let matchedService = null;
  
  Object.entries(pathMappings).forEach(([prefix, service]) => {
    if (path.startsWith(prefix) && (!matchedPrefix || prefix.length > matchedPrefix.length)) {
      matchedPrefix = prefix;
      matchedService = service;
    }
  });
  
  return matchedService;
}

/**
 * Proxy middleware that routes requests to the appropriate service
 */
function proxyMiddleware(req, res, next) {
  const path = req.originalUrl;
  const service = getServiceForPath(path);
  
  if (!service || !serviceUrls[service]) {
    console.warn(\`No service mapping found for path: \${path}\`);
    return next();
  }
  
  const targetUrl = serviceUrls[service];
  console.log(\`Proxying request: \${path} -> \${service} (\${targetUrl})\`);
  
  const proxy = createProxyMiddleware({
    target: targetUrl,
    changeOrigin: true,
    logLevel: 'silent',
    onError: (err, req, res) => {
      console.error(\`Proxy error for \${path}: \${err.message}\`);
      res.status(500).json({
        success: false,
        message: 'Service unavailable',
        error: \`Failed to connect to \${service} service\`
      });
    }
  });
  
  return proxy(req, res, next);
}

module.exports = { proxyMiddleware };
`;
  
  try {
    // Ensure directory exists
    const middlewareDir = path.dirname(proxyMiddlewarePath);
    if (!fs.existsSync(middlewareDir)) {
      fs.mkdirSync(middlewareDir, { recursive: true });
    }
    
    fs.writeFileSync(proxyMiddlewarePath, proxyMiddleware);
    console.log(`${colors.green}✓ Created proxy.middleware.js${colors.reset}`);
    
    // Check if http-proxy-middleware is in package.json
    const packageJsonPath = path.join(apiGatewayRoot, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
        
        if (!deps['http-proxy-middleware']) {
          console.log(`${colors.yellow}⚠ http-proxy-middleware not found in package.json${colors.reset}`);
          console.log(`${colors.yellow}⚠ Please run: cd ${apiGatewayRoot} && npm install http-proxy-middleware --save${colors.reset}`);
        }
      } catch (error) {
        console.warn(`${colors.yellow}⚠ Could not check package.json: ${error.message}${colors.reset}`);
      }
    }
    
    return true;
  } catch (error) {
    console.error(`${colors.red}✗ Error creating proxy.middleware.js: ${error.message}${colors.reset}`);
    return false;
  }
}

// Create a restart script if it doesn't exist
function createRestartScript() {
  console.log(`\n${colors.cyan}[Bonus] Checking restart script...${colors.reset}`);
  
  const restartScriptPath = path.join(apiGatewayRoot, 'scripts/restart-gateway.sh');
  
  if (fs.existsSync(restartScriptPath)) {
    console.log(`${colors.green}✓ restart-gateway.sh exists${colors.reset}`);
    return true;
  }
  
  console.log(`${colors.yellow}⚠ restart-gateway.sh doesn't exist, creating it${colors.reset}`);
  
  const restartScript = `#!/bin/bash

# Script to restart the API Gateway service

echo "Stopping API Gateway..."
# Try to find and kill the Node.js process running the API Gateway
GATEWAY_PID=$(ps aux | grep "node.*api-gateway" | grep -v grep | awk '{print $2}')

if [ -n "$GATEWAY_PID" ]; then
  echo "Killing process $GATEWAY_PID"
  kill $GATEWAY_PID
  sleep 2
  
  # Check if process is still running and force kill if necessary
  if ps -p $GATEWAY_PID > /dev/null; then
    echo "Process still running, force killing..."
    kill -9 $GATEWAY_PID
  fi
else
  echo "No running API Gateway process found"
fi

echo "Starting API Gateway..."
cd "$(dirname "$0")/.."
npm start &

echo "API Gateway restarted"
`;
  
  try {
    // Ensure directory exists
    const scriptsDir = path.dirname(restartScriptPath);
    if (!fs.existsSync(scriptsDir)) {
      fs.mkdirSync(scriptsDir, { recursive: true });
    }
    
    fs.writeFileSync(restartScriptPath, restartScript);
    fs.chmodSync(restartScriptPath, '755'); // Make executable
    console.log(`${colors.green}✓ Created restart-gateway.sh${colors.reset}`);
    return true;
  } catch (error) {
    console.error(`${colors.red}✗ Error creating restart-gateway.sh: ${error.message}${colors.reset}`);
    return false;
  }
}

// Generate summary
function generateSummary(results) {
  console.log(`\n${colors.blue}${colors.bold}===== FIX SUMMARY =====${colors.reset}`);
  
  // Count successful steps
  const successCount = Object.values(results).filter(result => result).length;
  const totalSteps = Object.keys(results).filter(key => !key.startsWith('bonus_')).length;
  
  console.log(`\n${colors.cyan}${successCount} out of ${totalSteps} essential steps completed successfully${colors.reset}`);
  
  if (successCount === totalSteps) {
    console.log(`\n${colors.green}${colors.bold}✓ API Gateway configuration has been updated!${colors.reset}`);
    console.log(`\n${colors.green}Next steps:${colors.reset}`);
    console.log(`${colors.cyan}1. Restart the API Gateway:${colors.reset}`);
    console.log(`   cd ${apiGatewayRoot} && node scripts/restart-gateway.sh`);
    console.log(`${colors.cyan}2. Clear browser cache and refresh the Plans page${colors.reset}`);
    console.log(`${colors.cyan}3. If issues persist, check the API Gateway logs for errors${colors.reset}`);
  } else {
    console.log(`\n${colors.yellow}${colors.bold}⚠ Some steps failed. Manual intervention may be required.${colors.reset}`);
    
    // List failed steps
    Object.entries(results).forEach(([step, success]) => {
      if (!success && !step.startsWith('bonus_')) {
        console.log(`  ${colors.red}✗ Failed: ${step}${colors.reset}`);
      }
    });
    
    console.log(`\n${colors.yellow}Please address the issues and then restart the API Gateway:${colors.reset}`);
    console.log(`cd ${apiGatewayRoot} && node scripts/restart-gateway.sh`);
  }
}

// Main function
function main() {
  const results = {
    'service-url.config.js': false,
    'path-rewrite.config.js': false,
    'index.js': false,
    'bonus_proxy.middleware.js': false,
    'bonus_restart-script': false
  };
  
  try {
    results['service-url.config.js'] = fixServiceUrlConfig();
    results['path-rewrite.config.js'] = fixPathRewriteConfig();
    results['index.js'] = fixIndexJs();
    results['bonus_proxy.middleware.js'] = createProxyMiddleware();
    results['bonus_restart-script'] = createRestartScript();
    
    generateSummary(results);
  } catch (error) {
    console.error(`${colors.red}Fatal error during fix process: ${error.message}${colors.reset}`);
  }
}

// Run the main function
main();
