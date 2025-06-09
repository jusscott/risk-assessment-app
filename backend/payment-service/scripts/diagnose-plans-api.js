#!/usr/bin/env node

/**
 * Diagnostic script for plans API issues
 * This script performs several checks to identify why plans aren't showing up properly
 */

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

console.log(`${colors.blue}===== PLANS API DIAGNOSTIC TOOL =====${colors.reset}`);

// Try to load required dependencies
let prisma, axios;
try {
  console.log(`${colors.cyan}Loading dependencies...${colors.reset}`);
  require('dotenv').config({ path: __dirname + '/../.env' });
  const { PrismaClient } = require('@prisma/client');
  prisma = new PrismaClient();
  axios = require('axios');
  console.log(`${colors.green}✓ Dependencies loaded successfully${colors.reset}`);
} catch (error) {
  console.error(`${colors.red}ERROR: Failed to load dependencies: ${error.message}${colors.reset}`);
  console.error(`${colors.yellow}Please run 'npm install @prisma/client axios' first${colors.reset}`);
  process.exit(1);
}

// Main diagnostic function
async function diagnose() {
  try {
    console.log(`${colors.blue}\n1. Checking database plans data${colors.reset}`);
    
    // 1. Check database plans
    const plans = await prisma.plan.findMany();
    
    if (plans.length === 0) {
      console.log(`${colors.red}✗ No plans found in database!${colors.reset}`);
      console.log(`${colors.yellow}Please run the fix-plans-issue.js script to create default plans${colors.reset}`);
    } else {
      console.log(`${colors.green}✓ Found ${plans.length} plans in database${colors.reset}`);
      
      // Check active flag
      const activePlans = plans.filter(plan => plan.active === true);
      console.log(`${colors.cyan}- Active plans: ${activePlans.length}/${plans.length}${colors.reset}`);
      
      if (activePlans.length === 0) {
        console.log(`${colors.red}✗ No active plans found! This is likely causing the issue.${colors.reset}`);
      }
      
      // Display plan details
      console.log(`${colors.cyan}\nPlan details:${colors.reset}`);
      plans.forEach(plan => {
        const activeStatus = plan.active ? `${colors.green}active${colors.reset}` : `${colors.red}inactive${colors.reset}`;
        console.log(`- ${plan.name}: ${plan.price} ${plan.currency} (${activeStatus})`);
        console.log(`  ID: ${plan.id}, Features: ${plan.features ? plan.features.length : 0}`);
      });
    }
    
    // 2. Check local API endpoint
    console.log(`${colors.blue}\n2. Testing local payment service plans API endpoint${colors.reset}`);
    let paymentServiceResponse;
    try {
      // Get config to determine port
      let config;
      try {
        config = require('../src/config/config');
      } catch (error) {
        console.log(`${colors.yellow}⚠ Could not load config file: ${error.message}${colors.reset}`);
        console.log(`${colors.yellow}Using default port 5003${colors.reset}`);
        config = { app: { port: 5003 } };
      }
      
      const port = config.app.port || 5003;
      const url = `http://localhost:${port}/api/plans`;
      
      console.log(`${colors.cyan}Checking direct API endpoint: ${url}${colors.reset}`);
      paymentServiceResponse = await axios.get(url);
      
      if (paymentServiceResponse.status === 200 && paymentServiceResponse.data.success) {
        const plansCount = paymentServiceResponse.data.data.length;
        console.log(`${colors.green}✓ Direct API call successful, returned ${plansCount} plans${colors.reset}`);
        
        if (plansCount === 0) {
          console.log(`${colors.red}✗ API returned empty plans array!${colors.reset}`);
        }
      } else {
        console.log(`${colors.red}✗ API returned unexpected response: ${JSON.stringify(paymentServiceResponse.data)}${colors.reset}`);
      }
    } catch (error) {
      console.log(`${colors.red}✗ Failed to reach payment service API: ${error.message}${colors.reset}`);
      console.log(`${colors.yellow}Is the payment service running? Try starting it with 'npm run start' in the payment-service directory${colors.reset}`);
    }
    
    // 3. Check API Gateway endpoint
    console.log(`${colors.blue}\n3. Testing API Gateway plans endpoint${colors.reset}`);
    try {
      // Use port 5000 for API Gateway
      const apiGatewayUrl = 'http://localhost:5000/api/plans';
      
      console.log(`${colors.cyan}Checking API Gateway endpoint: ${apiGatewayUrl}${colors.reset}`);
      const apiGatewayResponse = await axios.get(apiGatewayUrl);
      
      if (apiGatewayResponse.status === 200) {
        console.log(`${colors.green}✓ API Gateway returned status 200${colors.reset}`);
        
        // Check response format
        if (Array.isArray(apiGatewayResponse.data)) {
          console.log(`${colors.green}✓ API Gateway returned an array with ${apiGatewayResponse.data.length} plans${colors.reset}`);
          
          if (apiGatewayResponse.data.length === 0) {
            console.log(`${colors.red}✗ API Gateway returned empty plans array!${colors.reset}`);
          }
        } else if (apiGatewayResponse.data && apiGatewayResponse.data.success && Array.isArray(apiGatewayResponse.data.data)) {
          console.log(`${colors.green}✓ API Gateway returned success object with ${apiGatewayResponse.data.data.length} plans${colors.reset}`);
          
          if (apiGatewayResponse.data.data.length === 0) {
            console.log(`${colors.red}✗ API Gateway returned empty plans array!${colors.reset}`);
          }
        } else {
          console.log(`${colors.red}✗ API Gateway returned unexpected response format: ${JSON.stringify(apiGatewayResponse.data).substring(0, 200)}...${colors.reset}`);
        }
        
        // Compare to direct payment service response
        if (paymentServiceResponse && paymentServiceResponse.data && paymentServiceResponse.data.success) {
          const directPlans = paymentServiceResponse.data.data.length;
          const gatewayPlans = Array.isArray(apiGatewayResponse.data) ? 
            apiGatewayResponse.data.length : 
            (apiGatewayResponse.data.data ? apiGatewayResponse.data.data.length : 0);
          
          if (directPlans !== gatewayPlans) {
            console.log(`${colors.red}✗ Plan count mismatch! Direct API: ${directPlans}, Gateway API: ${gatewayPlans}${colors.reset}`);
          } else {
            console.log(`${colors.green}✓ Plan counts match between direct API and gateway${colors.reset}`);
          }
        }
      } else {
        console.log(`${colors.red}✗ API Gateway returned non-200 status: ${apiGatewayResponse.status}${colors.reset}`);
      }
    } catch (error) {
      console.log(`${colors.red}✗ Failed to reach API Gateway: ${error.message}${colors.reset}`);
      console.log(`${colors.yellow}Is the API Gateway running? Try starting it with 'npm run start' in the api-gateway directory${colors.reset}`);
    }
    
    // 4. Check frontend expected schema vs backend schema
    console.log(`${colors.blue}\n4. Analyzing schema compatibility${colors.reset}`);
    
    if (plans.length > 0) {
      const backendPlan = plans[0];
      console.log(`${colors.cyan}Backend Plan Schema:${colors.reset}`);
      console.log(Object.keys(backendPlan).map(key => `- ${key}: ${typeof backendPlan[key]}`).join('\n'));
      
      console.log(`${colors.cyan}\nFrontend Expected Schema:${colors.reset}`);
      console.log(`- id: string
- name: string
- description: string
- price: number
- currency: string
- interval: 'month' | 'year'
- features: string[]
- isActive: boolean
- stripeProductId: string
- stripePriceId: string
- createdAt: string
- updatedAt: string`);
      
      // Check for key mismatches that could cause issues
      if (!('active' in backendPlan)) {
        console.log(`${colors.red}✗ Backend plan is missing 'active' property!${colors.reset}`);
      } else if (backendPlan.active === undefined || backendPlan.active === null) {
        console.log(`${colors.red}✗ Backend plan has null/undefined 'active' property!${colors.reset}`);
      }
      
      // Check billingCycle vs interval issue
      if ('billingCycle' in backendPlan && !('interval' in backendPlan)) {
        console.log(`${colors.yellow}⚠ Schema mismatch: Backend uses 'billingCycle' but frontend expects 'interval'${colors.reset}`);
      }
      
      // Check active vs isActive issue
      if ('active' in backendPlan && !('isActive' in backendPlan)) {
        console.log(`${colors.yellow}⚠ Schema mismatch: Backend uses 'active' but frontend expects 'isActive'${colors.reset}`);
      }
    } else {
      console.log(`${colors.yellow}⚠ Can't analyze schema because no plans exist in database${colors.reset}`);
    }
    
    // Summary and recommendations
    console.log(`${colors.blue}\n===== DIAGNOSIS SUMMARY =====${colors.reset}`);
    
    if (plans.length === 0) {
      console.log(`${colors.red}✗ Main issue: No plans in database${colors.reset}`);
      console.log(`${colors.green}Solution: Run the fix-plans-issue.js script to create default plans${colors.reset}`);
    } else if (plans.filter(p => p.active === true).length === 0) {
      console.log(`${colors.red}✗ Main issue: No active plans in database${colors.reset}`);
      console.log(`${colors.green}Solution: Update plans to set active=true or run fix-plans-issue.js script${colors.reset}`);
    } else {
      console.log(`${colors.yellow}⚠ Potential issues:${colors.reset}`);
      console.log(`1. API Gateway may not be properly forwarding requests to payment service`);
      console.log(`2. Schema mismatch between frontend and backend (active vs isActive, billingCycle vs interval)`);
      console.log(`3. Payment service API might not be correctly filtering for active plans`);
      
      console.log(`\n${colors.green}Recommendations:${colors.reset}`);
      console.log(`1. Check if schema transformation is needed in the payment controller`);
      console.log(`2. Verify API Gateway configuration for /api/plans route`);
      console.log(`3. Make sure plan.controller.js returns active plans and transforms fields correctly`);
    }
    
  } catch (error) {
    console.error(`${colors.red}ERROR during diagnosis: ${error.message}${colors.reset}`);
    console.error(error);
  } finally {
    if (prisma) {
      await prisma.$disconnect();
    }
  }
}

// Run the diagnostic
diagnose()
  .then(() => {
    console.log(`${colors.green}\nDiagnostic completed.${colors.reset}`);
    process.exit(0);
  })
  .catch(error => {
    console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
    process.exit(1);
  });
