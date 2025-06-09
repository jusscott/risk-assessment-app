#!/usr/bin/env node

/**
 * API Plans Check Script
 * This script checks the plans API endpoint directly to verify that 
 * plans are being returned correctly even when database access fails.
 */

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

console.log(`${colors.blue}${colors.bold}===== API PLANS CHECK TOOL =====${colors.reset}`);

// Try to load required modules
try {
  const axios = require('axios');
  const fs = require('fs');
  const path = require('path');
  
  // Get config
  let port = 5003; // Default port for payment service
  try {
    const configPath = path.resolve(__dirname, '../src/config/config.js');
    if (fs.existsSync(configPath)) {
      const config = require(configPath);
      if (config && config.app && config.app.port) {
        port = config.app.port;
      }
    }
  } catch (error) {
    console.log(`${colors.yellow}⚠ Could not load config file, using default port ${port}${colors.reset}`);
  }
  
  // Check the API endpoint
  async function checkPlansApi() {
    const url = `http://localhost:${port}/api/plans`;
    console.log(`${colors.cyan}Checking API endpoint: ${url}${colors.reset}`);
    
    try {
      const response = await axios.get(url, { timeout: 5000 });
      
      if (response.status === 200) {
        console.log(`${colors.green}✓ API endpoint responded with status 200${colors.reset}`);
        
        if (response.data && response.data.success) {
          const plans = response.data.data;
          console.log(`${colors.green}✓ API returned ${plans.length} plans${colors.reset}`);
          
          if (plans.length > 0) {
            console.log(`\n${colors.blue}Plans available:${colors.reset}`);
            plans.forEach((plan, index) => {
              console.log(`\n${colors.cyan}Plan #${index + 1}: ${plan.name}${colors.reset}`);
              console.log(`  Price: ${plan.currency || 'USD'} ${plan.price || 'N/A'} ${plan.billingCycle ? `(${plan.billingCycle.toLowerCase()})` : ''}`);
              console.log(`  Description: ${plan.description}`);
              console.log(`  Active: ${plan.active === true ? colors.green + '✓ Yes' + colors.reset : colors.red + '✗ No' + colors.reset}`);
              console.log(`  Features:`);
              if (plan.features && Array.isArray(plan.features)) {
                plan.features.forEach(feature => {
                  console.log(`    - ${feature}`);
                });
              } else {
                console.log(`    ${colors.yellow}⚠ No features defined${colors.reset}`);
              }
            });
            
            console.log(`\n${colors.green}${colors.bold}✓ Plans are available via the API${colors.reset}`);
            console.log(`${colors.green}✓ The frontend should be able to display these plans${colors.reset}`);
            console.log(`\n${colors.blue}Recommendations:${colors.reset}`);
            
            // Check if any plans are inactive
            const inactivePlans = plans.filter(plan => plan.active !== true);
            if (inactivePlans.length > 0) {
              console.log(`${colors.yellow}⚠ Found ${inactivePlans.length} inactive plans that won't be displayed${colors.reset}`);
              console.log(`${colors.yellow}  Consider activating these plans using the fix-plans-issue.js script${colors.reset}`);
            }
            
            console.log(`${colors.cyan}1. Clear browser cache and refresh the Plans page${colors.reset}`);
            console.log(`${colors.cyan}2. If problems persist, check the API Gateway configuration${colors.reset}`);
            console.log(`${colors.cyan}3. Restart the API Gateway: cd backend/api-gateway && node scripts/restart-gateway.sh${colors.reset}`);
          } else {
            console.log(`${colors.red}✗ API returned 0 plans${colors.reset}`);
            console.log(`${colors.yellow}Consider running the fix-plans-issue.js script to create default plans${colors.reset}`);
          }
        } else {
          console.log(`${colors.red}✗ API returned success=false or unexpected format: ${JSON.stringify(response.data)}${colors.reset}`);
        }
      } else {
        console.log(`${colors.red}✗ API returned non-200 status: ${response.status}${colors.reset}`);
      }
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.log(`${colors.red}✗ Could not connect to API: Connection refused${colors.reset}`);
        console.log(`${colors.yellow}The payment service is not running${colors.reset}`);
        console.log(`${colors.yellow}Start the payment service using: cd backend/payment-service && npm run start${colors.reset}`);
      } else {
        console.log(`${colors.red}✗ Error testing API endpoint: ${error.message}${colors.reset}`);
      }
    }
  }
  
  // Run the API check
  checkPlansApi();
  
} catch (error) {
  if (error.code === 'MODULE_NOT_FOUND' && error.message.includes('axios')) {
    console.log(`${colors.red}✗ axios module not found${colors.reset}`);
    console.log(`${colors.yellow}Please install axios: npm install axios${colors.reset}`);
  } else {
    console.log(`${colors.red}✗ Error during script execution: ${error.message}${colors.reset}`);
  }
}
