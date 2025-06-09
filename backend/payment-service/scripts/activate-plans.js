#!/usr/bin/env node

/**
 * Activation script for plans
 * This script will set isActive=true for all plans
 */

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

console.log(`${colors.blue}===== PLANS ACTIVATION TOOL =====${colors.reset}`);

// Load dependencies
try {
  require('dotenv').config({ path: __dirname + '/../.env' });
  console.log(`${colors.green}✓ Successfully loaded environment variables${colors.reset}`);
} catch (error) {
  console.log(`${colors.yellow}⚠ Could not load .env file: ${error.message}${colors.reset}`);
}

// Initialize Prisma client
console.log(`${colors.blue}Initializing Prisma client...${colors.reset}`);
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
console.log(`${colors.green}✓ Successfully initialized Prisma client${colors.reset}`);
console.log(`Starting activation at ${new Date().toISOString()}\n`);

// Main function
async function activatePlans() {
  try {
    // 1. Check for existing plans
    console.log(`${colors.blue}[1/2] Checking for existing plans...${colors.reset}`);
    const plans = await prisma.plan.findMany();
    
    if (plans.length === 0) {
      console.log(`${colors.red}✗ No plans found in database!${colors.reset}`);
      return;
    }
    
    console.log(`${colors.green}✓ Found ${plans.length} existing plans${colors.reset}`);
    
    // 2. Set isActive flag for all plans
    console.log(`\n${colors.blue}[2/2] Setting isActive flag for all plans...${colors.reset}`);
    try {
      const updatedCount = await prisma.plan.updateMany({
        where: {},
        data: {
          isActive: true
        }
      });
      
      console.log(`${colors.green}✓ Successfully activated ${updatedCount.count} plans${colors.reset}`);
    } catch (error) {
      console.log(`${colors.red}✗ Error updating isActive flag: ${error.message}${colors.reset}`);
      console.error(error);
    }
    
    // Show plans with their active status
    const updatedPlans = await prisma.plan.findMany();
    console.log(`\n${colors.blue}Current plans:${colors.reset}`);
    updatedPlans.forEach(plan => {
      const activeStatus = plan.isActive ? 
        `${colors.green}active${colors.reset}` : 
        `${colors.red}inactive${colors.reset}`;
      
      console.log(`- ${plan.name}: ${plan.price} ${plan.currency} (${activeStatus})`);
    });
    
  } catch (error) {
    console.error(`${colors.red}ERROR: ${error.message}${colors.reset}`);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
activatePlans()
  .then(() => {
    console.log(`\n${colors.green}===== ACTIVATION COMPLETE =====${colors.reset}`);
    console.log(`Plans should now be properly activated. Next steps:`);
    console.log(`1. Restart the payment service using: npm run restart`);
    console.log(`2. Restart the API gateway service`);
    console.log(`3. Clear your browser cache and refresh the Plans page`);
    process.exit(0);
  })
  .catch(error => {
    console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
    process.exit(1);
  });
