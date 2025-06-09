#!/usr/bin/env node

/**
 * Fix script for plans functionality issues
 * This script checks for existing plans, adds active flag if needed,
 * creates standard plans if none exist, and ensures they are set to active
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

console.log(`${colors.blue}===== PLANS FIX TOOL =====${colors.reset}`);

// Try to load dotenv, but continue if it fails
try {
  console.log(`${colors.cyan}Attempting to load dotenv module...${colors.reset}`);
  require('dotenv').config({ path: __dirname + '/../.env' });
  console.log(`${colors.green}✓ Successfully loaded environment variables from .env${colors.reset}`);
} catch (error) {
  console.log(`${colors.yellow}⚠ Dotenv module not available. Setting DATABASE_URL manually.${colors.reset}`);
  
  // Set DATABASE_URL manually if not loaded from .env
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = "postgresql://postgres:postgres123@localhost:5432/payment_db?schema=public";
    console.log(`${colors.yellow}Manually set DATABASE_URL to: ${process.env.DATABASE_URL}${colors.reset}`);
  }
}

// Verify DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.error(`${colors.red}ERROR: DATABASE_URL environment variable not found${colors.reset}`);
  console.error(`${colors.yellow}Please ensure the .env file exists in the payment-service directory and contains DATABASE_URL${colors.reset}`);
  process.exit(1);
}

// Try to load @prisma/client
let prisma;
try {
  console.log(`${colors.cyan}Initializing Prisma client...${colors.reset}`);
  const { PrismaClient } = require('@prisma/client');
  prisma = new PrismaClient();
  console.log(`${colors.green}✓ Successfully initialized Prisma client${colors.reset}`);
} catch (error) {
  console.error(`${colors.red}ERROR: Failed to initialize Prisma client: ${error.message}${colors.reset}`);
  console.error(`${colors.yellow}Please run 'npm install @prisma/client' and 'npx prisma generate' first${colors.reset}`);
  process.exit(1);
}

// Default plans to create if none exist
const defaultPlans = [
  {
    name: 'Basic',
    description: 'Essential risk assessment features for small businesses',
    price: 49.99,
    currency: 'USD',
    billingCycle: 'MONTHLY',
    features: ['5 assessments per month', 'Basic reporting', 'Email support'],
    active: true
  },
  {
    name: 'Professional',
    description: 'Advanced features for growing organizations',
    price: 99.99,
    currency: 'USD',
    billingCycle: 'MONTHLY',
    features: ['20 assessments per month', 'Advanced reporting', 'Priority support', 'Custom rule creation'],
    active: true
  },
  {
    name: 'Enterprise',
    description: 'Comprehensive solution for large enterprises',
    price: 299.99,
    currency: 'USD',
    billingCycle: 'MONTHLY',
    features: ['Unlimited assessments', 'Enterprise reporting', '24/7 support', 'Custom rule creation', 'API access', 'Dedicated account manager'],
    active: true
  },
  {
    name: 'Annual Basic',
    description: 'Essential features with annual billing discount',
    price: 499.99,
    currency: 'USD',
    billingCycle: 'YEARLY',
    features: ['5 assessments per month', 'Basic reporting', 'Email support'],
    active: true
  },
  {
    name: 'Annual Professional',
    description: 'Advanced features with annual billing discount',
    price: 999.99,
    currency: 'USD',
    billingCycle: 'YEARLY',
    features: ['20 assessments per month', 'Advanced reporting', 'Priority support', 'Custom rule creation'],
    active: true
  }
];

async function main() {
  console.log(`${colors.blue}Starting repair at ${new Date().toISOString()}${colors.reset}\n`);
  
  try {
    // 1. Check for existing plans
    console.log(`${colors.cyan}[1/4] Checking for existing plans...${colors.reset}`);
    const existingPlans = await prisma.plan.findMany();
    
    if (existingPlans.length === 0) {
      console.log(`${colors.yellow}No plans found in database. Creating default plans...${colors.reset}`);
      
      // Create default plans
      for (const plan of defaultPlans) {
        await prisma.plan.create({
          data: {
            name: plan.name,
            description: plan.description,
            price: plan.price,
            currency: plan.currency,
            billingCycle: plan.billingCycle,
            features: plan.features,
            active: plan.active
          }
        });
        console.log(`${colors.green}✓ Created plan: ${plan.name}${colors.reset}`);
      }
      
      console.log(`${colors.green}✓ Successfully created ${defaultPlans.length} default plans${colors.reset}`);
    } else {
      console.log(`${colors.green}✓ Found ${existingPlans.length} existing plans${colors.reset}`);
    }
    
    // 2. Check if active field exists in schema
    console.log(`\n${colors.cyan}[2/4] Checking if 'active' field exists in schema...${colors.reset}`);
    let hasActiveField = false;
    
    try {
      // Get the Prisma schema for the Plan model
      const plansTable = await prisma.$queryRaw`SELECT * FROM "Plan" LIMIT 1`;
      if (plansTable && plansTable.length > 0) {
        const planRecord = plansTable[0];
        hasActiveField = 'active' in planRecord;
      }
      
      if (hasActiveField) {
        console.log(`${colors.green}✓ 'active' field exists in schema${colors.reset}`);
      } else {
        console.log(`${colors.yellow}⚠ 'active' field does not exist in schema${colors.reset}`);
        console.log(`${colors.yellow}This requires a database migration to add the field${colors.reset}`);
        console.log(`${colors.yellow}Please ensure migration 20250521_add_active has been applied${colors.reset}`);
        
        // Exit early since we can't proceed without the active field
        throw new Error("Missing 'active' field in schema. Please apply required migrations first.");
      }
    } catch (error) {
      if (error.message.includes("Missing 'active' field")) {
        throw error;
      }
      console.log(`${colors.yellow}⚠ Could not directly check schema: ${error.message}${colors.reset}`);
      console.log(`${colors.yellow}Will attempt to use active field assuming it exists${colors.reset}`);
    }
    
    // 3. Set active flag for all plans
    console.log(`\n${colors.cyan}[3/4] Setting active flag for all plans...${colors.reset}`);
    try {
      const updatedCount = await prisma.plan.updateMany({
        where: {
          active: false
        },
        data: {
          active: true
        }
      });
      
      if (updatedCount.count > 0) {
        console.log(`${colors.green}✓ Updated ${updatedCount.count} plans to active=true${colors.reset}`);
      } else {
        console.log(`${colors.green}✓ All plans are already marked as active${colors.reset}`);
      }
    } catch (error) {
      console.log(`${colors.yellow}⚠ Error updating active flag: ${error.message}${colors.reset}`);
      console.log(`${colors.yellow}This might indicate that the 'active' field doesn't exist${colors.reset}`);
    }
    
    // 4. Verify API endpoint directly on the payment service
    console.log(`\n${colors.cyan}[4/4] Verifying plans API endpoint...${colors.reset}`);
    try {
      // Try to load the config file
      let config;
      try {
        config = require('../src/config/config');
      } catch (error) {
        console.log(`${colors.yellow}⚠ Could not load config file: ${error.message}${colors.reset}`);
        console.log(`${colors.yellow}Using default port 5003${colors.reset}`);
        config = { app: { port: 5003 } };
      }
      
      // Try to load axios
      let axios;
      try {
        axios = require('axios');
      } catch (error) {
        console.log(`${colors.yellow}⚠ Could not load axios: ${error.message}${colors.reset}`);
        console.log(`${colors.yellow}Skipping API verification${colors.reset}`);
        throw new Error('Axios not available');
      }
      
      const port = config.app.port || 5003;
      const url = `http://localhost:${port}/api/plans`;
      
      console.log(`${colors.cyan}Checking API endpoint: ${url}${colors.reset}`);
      const response = await axios.get(url);
      
      if (response.status === 200 && response.data.success) {
        const plansCount = response.data.data.length;
        console.log(`${colors.green}✓ API successfully returned ${plansCount} plans${colors.reset}`);
      } else {
        console.log(`${colors.yellow}⚠ API returned unexpected response: ${JSON.stringify(response.data)}${colors.reset}`);
        console.log(`${colors.yellow}This may indicate issues with the payment service${colors.reset}`);
      }
    } catch (error) {
      console.error(`${colors.yellow}⚠ Could not verify API: ${error.message}${colors.reset}`);
      if (error.code === 'ECONNREFUSED') {
        console.log(`${colors.yellow}  This suggests the payment service is not running${colors.reset}`);
        console.log(`${colors.yellow}  Start the payment service to complete verification${colors.reset}`);
      }
    }
    
    // Summary
    console.log(`\n${colors.blue}===== FIX COMPLETE =====${colors.reset}`);
    console.log(`${colors.green}Plans should now be properly configured:${colors.reset}`);
    console.log(`1. Default plans created (if none existed)`);
    console.log(`2. All plans marked as active=true`);
    console.log(`\n${colors.cyan}Next steps:${colors.reset}`);
    console.log(`1. Restart the payment service using: npm run restart`);
    console.log(`2. Restart the API gateway service`);
    console.log(`3. Clear your browser cache and refresh the Plans page`);
    
  } catch (error) {
    console.error(`${colors.red}Error during fix process: ${error.message}${colors.reset}`);
    console.error(`${colors.yellow}Fix process incomplete. Please resolve the issues and try again.${colors.reset}`);
  } finally {
    if (prisma) {
      await prisma.$disconnect();
    }
  }
}

main()
  .catch(async (e) => {
    console.error(`${colors.red}Fatal error:${colors.reset}`, e);
    if (prisma) {
      await prisma.$disconnect();
    }
    process.exit(1);
  });
