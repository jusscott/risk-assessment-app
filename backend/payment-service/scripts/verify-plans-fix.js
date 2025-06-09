#!/usr/bin/env node

/**
 * Script to verify plans API fix is working correctly
 * This script:
 * 1. Checks if plans are accessible from the API
 * 2. Verifies they are correctly formatted
 * 3. Checks if they match what's in the database
 */

const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

// Initialize Prisma client
const prisma = new PrismaClient();

async function verifyFix() {
  console.log(`${colors.blue}===== VERIFYING PLANS API FIX =====${colors.reset}`);
  
  // Step 1: Check the database
  try {
    console.log(`${colors.cyan}\n1. Checking plans in database${colors.reset}`);
    
    const plans = await prisma.plan.findMany();
    const activePlans = plans.filter(plan => plan.isActive);
    
    if (plans.length === 0) {
      console.log(`${colors.red}✗ No plans found in database${colors.reset}`);
      console.log(`${colors.yellow}Run the apply-plans-fix.js script first to create plans${colors.reset}`);
      return;
    }
    
    console.log(`${colors.green}✓ Found ${plans.length} plans in database, ${activePlans.length} active${colors.reset}`);
    
    // Display plans
    plans.forEach(plan => {
      const status = plan.isActive ? `${colors.green}active${colors.reset}` : `${colors.red}inactive${colors.reset}`;
      console.log(`- ${plan.name}: $${plan.price} ${plan.currency} (${status})`);
      
      // Check if plan has all required fields
      const missingFields = [];
      if (!plan.interval) missingFields.push('interval');
      if (!plan.features) missingFields.push('features');
      
      if (missingFields.length > 0) {
        console.log(`  ${colors.yellow}⚠ Missing fields: ${missingFields.join(', ')}${colors.reset}`);
      }
    });
    
    // Step 2: Check direct payment service API
    console.log(`${colors.cyan}\n2. Checking direct payment service API${colors.reset}`);
    
    let paymentServiceResponse;
    try {
      const paymentServiceUrl = 'http://localhost:5003/api/plans';
      console.log(`Calling ${paymentServiceUrl}...`);
      
      paymentServiceResponse = await axios.get(paymentServiceUrl);
      
      if (paymentServiceResponse.status === 200) {
        if (paymentServiceResponse.data && paymentServiceResponse.data.success) {
          const apiPlans = paymentServiceResponse.data.data;
          console.log(`${colors.green}✓ Payment service API returned ${apiPlans.length} plans${colors.reset}`);
          
          // Verify plans have correct format
          if (apiPlans.length > 0) {
            const firstPlan = apiPlans[0];
            console.log(`${colors.cyan}First plan from API:${colors.reset}`);
            console.log(JSON.stringify(firstPlan, null, 2));
            
            // Check for expected fields
            const expectedFields = ['id', 'name', 'description', 'price', 'currency', 'interval', 'features', 'isActive'];
            const missingFields = expectedFields.filter(field => !firstPlan.hasOwnProperty(field));
            
            if (missingFields.length > 0) {
              console.log(`${colors.red}✗ Plan is missing expected fields: ${missingFields.join(', ')}${colors.reset}`);
            } else {
              console.log(`${colors.green}✓ Plan has all expected fields${colors.reset}`);
            }
          }
        } else {
          console.log(`${colors.red}✗ Payment service API returned unexpected format:${colors.reset}`);
          console.log(JSON.stringify(paymentServiceResponse.data, null, 2));
        }
      } else {
        console.log(`${colors.red}✗ Payment service API returned status: ${paymentServiceResponse.status}${colors.reset}`);
      }
    } catch (error) {
      console.log(`${colors.red}✗ Failed to connect to payment service API: ${error.message}${colors.reset}`);
      console.log(`${colors.yellow}⚠ Is the payment service running?${colors.reset}`);
    }
    
    // Step 3: Check API Gateway
    console.log(`${colors.cyan}\n3. Checking API Gateway${colors.reset}`);
    
    let apiGatewayResponse;
    try {
      const apiGatewayUrl = 'http://localhost:5050/api/plans';
      console.log(`Calling ${apiGatewayUrl}...`);
      
      apiGatewayResponse = await axios.get(apiGatewayUrl);
      
      if (apiGatewayResponse.status === 200) {
        let apiGatewayPlans;
        
        // Handle different response formats
        if (Array.isArray(apiGatewayResponse.data)) {
          apiGatewayPlans = apiGatewayResponse.data;
          console.log(`${colors.green}✓ API Gateway returned array of ${apiGatewayPlans.length} plans${colors.reset}`);
        } else if (apiGatewayResponse.data && apiGatewayResponse.data.success && Array.isArray(apiGatewayResponse.data.data)) {
          apiGatewayPlans = apiGatewayResponse.data.data;
          console.log(`${colors.green}✓ API Gateway returned success object with ${apiGatewayPlans.length} plans${colors.reset}`);
        } else {
          console.log(`${colors.red}✗ API Gateway returned unexpected format:${colors.reset}`);
          console.log(JSON.stringify(apiGatewayResponse.data, null, 2));
          apiGatewayPlans = [];
        }
        
        // Verify plans have correct format
        if (apiGatewayPlans.length > 0) {
          const firstPlan = apiGatewayPlans[0];
          console.log(`${colors.cyan}First plan from API Gateway:${colors.reset}`);
          console.log(JSON.stringify(firstPlan, null, 2));
          
          // Check for expected fields
          const expectedFields = ['id', 'name', 'description', 'price', 'currency', 'interval', 'features', 'isActive'];
          const missingFields = expectedFields.filter(field => !firstPlan.hasOwnProperty(field));
          
          if (missingFields.length > 0) {
            console.log(`${colors.red}✗ Plan is missing expected fields: ${missingFields.join(', ')}${colors.reset}`);
          } else {
            console.log(`${colors.green}✓ Plan has all expected fields${colors.reset}`);
          }
          
          // Compare with database plans
          const dbPlan = plans.find(p => p.id.toString() === firstPlan.id.toString());
          if (dbPlan) {
            console.log(`${colors.green}✓ Plan matches database record${colors.reset}`);
          } else {
            console.log(`${colors.red}✗ Plan not found in database records${colors.reset}`);
          }
        }
      } else {
        console.log(`${colors.red}✗ API Gateway returned status: ${apiGatewayResponse.status}${colors.reset}`);
      }
    } catch (error) {
      console.log(`${colors.red}✗ Failed to connect to API Gateway: ${error.message}${colors.reset}`);
      console.log(`${colors.yellow}⚠ Is the API Gateway running?${colors.reset}`);
    }
    
    // Step 4: Verify Frontend compatibility
    console.log(`${colors.cyan}\n4. Verifying Frontend Compatibility${colors.reset}`);
    
    console.log(`${colors.blue}Frontend expects plans with the following schema:${colors.reset}`);
    console.log(`
{
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  features: string[];
  isActive: boolean;
  stripeProductId: string;
  stripePriceId: string;
  createdAt: string;
  updatedAt: string;
}
`);
    
    if (apiGatewayResponse && apiGatewayResponse.data) {
      let apiPlans;
      if (Array.isArray(apiGatewayResponse.data)) {
        apiPlans = apiGatewayResponse.data;
      } else if (apiGatewayResponse.data && apiGatewayResponse.data.data) {
        apiPlans = apiGatewayResponse.data.data;
      }
      
      if (apiPlans && apiPlans.length > 0) {
        const plan = apiPlans[0];
        
        const checks = [
          { name: 'id is string', result: typeof plan.id === 'string' },
          { name: 'name is string', result: typeof plan.name === 'string' },
          { name: 'description is string', result: typeof plan.description === 'string' },
          { name: 'price is number', result: typeof plan.price === 'number' },
          { name: 'currency is string', result: typeof plan.currency === 'string' },
          { name: 'interval is "month" or "year"', result: plan.interval === 'month' || plan.interval === 'year' },
          { name: 'features is array', result: Array.isArray(plan.features) },
          { name: 'isActive is boolean', result: typeof plan.isActive === 'boolean' },
          { name: 'has stripeProductId', result: 'stripeProductId' in plan },
          { name: 'has stripePriceId', result: 'stripePriceId' in plan },
          { name: 'createdAt is string', result: typeof plan.createdAt === 'string' },
          { name: 'updatedAt is string', result: typeof plan.updatedAt === 'string' }
        ];
        
        let allPassed = true;
        for (const check of checks) {
          const status = check.result 
            ? `${colors.green}✓ PASS${colors.reset}` 
            : `${colors.red}✗ FAIL${colors.reset}`;
          console.log(`${status} - ${check.name}`);
          
          if (!check.result) allPassed = false;
        }
        
        if (allPassed) {
          console.log(`${colors.green}\n✓ API response is fully compatible with frontend expectations${colors.reset}`);
        } else {
          console.log(`${colors.red}\n✗ API response has compatibility issues with frontend${colors.reset}`);
        }
      }
    }
    
  } catch (error) {
    console.error(`${colors.red}Error during verification: ${error.message}${colors.reset}`);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
  
  console.log(`${colors.blue}\n===== VERIFICATION COMPLETE =====${colors.reset}`);
}

verifyFix()
  .then(() => {
    console.log(`${colors.green}\nScript completed successfully${colors.reset}`);
    process.exit(0);
  })
  .catch(error => {
    console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
    console.error(error);
    process.exit(1);
  });
