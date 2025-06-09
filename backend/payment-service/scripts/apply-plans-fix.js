#!/usr/bin/env node

/**
 * Script to apply the plans API fix
 * This script:
 * 1. Replaces the plan controller with the fixed version
 * 2. Ensures all plans have isActive=true
 * 3. Ensures plans have proper interval values
 */

const fs = require('fs');
const path = require('path');
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

async function applyFix() {
  console.log(`${colors.blue}===== APPLYING PLANS API FIX =====${colors.reset}`);
  
  // Step 1: Copy the fixed controller
  try {
    console.log(`${colors.cyan}\n1. Updating plan controller with fixed version${colors.reset}`);
    
    const sourcePath = path.join(__dirname, '..', 'src', 'controllers', 'plan.controller.fixed.js');
    const destPath = path.join(__dirname, '..', 'src', 'controllers', 'plan.controller.js');
    
    // Check if source file exists
    if (!fs.existsSync(sourcePath)) {
      console.error(`${colors.red}✗ Fixed controller file not found at: ${sourcePath}${colors.reset}`);
      console.error(`${colors.yellow}Please ensure the file exists before running this script${colors.reset}`);
      process.exit(1);
    }
    
    // Create backup of original file
    const backupPath = path.join(__dirname, '..', 'src', 'controllers', 'plan.controller.original.js');
    if (fs.existsSync(destPath)) {
      fs.copyFileSync(destPath, backupPath);
      console.log(`${colors.green}✓ Created backup of original controller at: ${backupPath}${colors.reset}`);
    }
    
    // Copy fixed controller to destination
    fs.copyFileSync(sourcePath, destPath);
    console.log(`${colors.green}✓ Successfully replaced plan controller with fixed version${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}✗ Error updating controller: ${error.message}${colors.reset}`);
    process.exit(1);
  }
  
  // Step 2: Fix database plans
  try {
    console.log(`${colors.cyan}\n2. Updating plans in database${colors.reset}`);
    
    // Get all plans
    const plans = await prisma.plan.findMany();
    console.log(`${colors.blue}Found ${plans.length} plans in database${colors.reset}`);
    
    // Check if we have any plans
    if (plans.length === 0) {
      console.log(`${colors.yellow}⚠ No plans found in database. Creating default plans...${colors.reset}`);
      
      // Create default plans
      await createDefaultPlans();
      console.log(`${colors.green}✓ Created default plans${colors.reset}`);
    } else {
      // Check for issues with existing plans
      const inactivePlans = plans.filter(plan => !plan.isActive);
      const plansWithoutInterval = plans.filter(plan => !plan.interval);
      
      if (inactivePlans.length > 0) {
        console.log(`${colors.yellow}⚠ Found ${inactivePlans.length} inactive plans. Activating...${colors.reset}`);
        
        // Activate all plans
        for (const plan of inactivePlans) {
          await prisma.plan.update({
            where: { id: plan.id },
            data: { isActive: true }
          });
        }
        
        console.log(`${colors.green}✓ Activated all plans${colors.reset}`);
      }
      
      if (plansWithoutInterval.length > 0) {
        console.log(`${colors.yellow}⚠ Found ${plansWithoutInterval.length} plans without interval. Fixing...${colors.reset}`);
        
        // Fix interval for all plans
        for (const plan of plansWithoutInterval) {
          await prisma.plan.update({
            where: { id: plan.id },
            data: { interval: 'monthly' }
          });
        }
        
        console.log(`${colors.green}✓ Added default 'monthly' interval to all plans${colors.reset}`);
      }
      
      // Ensure features are properly formatted as arrays
      for (const plan of plans) {
        if (!plan.features || typeof plan.features !== 'object') {
          console.log(`${colors.yellow}⚠ Plan ${plan.name} has invalid features. Fixing...${colors.reset}`);
          
          await prisma.plan.update({
            where: { id: plan.id },
            data: { features: [] }
          });
        }
      }
    }
    
    // Verify plans after fixes
    const updatedPlans = await prisma.plan.findMany();
    const activePlans = updatedPlans.filter(plan => plan.isActive);
    
    console.log(`${colors.green}✓ Database now has ${updatedPlans.length} total plans with ${activePlans.length} active plans${colors.reset}`);
    
    // Display plans
    console.log(`${colors.cyan}\nCurrent plans in database:${colors.reset}`);
    updatedPlans.forEach(plan => {
      console.log(`- ${plan.name}: $${plan.price} ${plan.currency} (${plan.isActive ? 'active' : 'inactive'}, interval: ${plan.interval || 'unspecified'})`);
    });
    
  } catch (error) {
    console.error(`${colors.red}✗ Error updating plans in database: ${error.message}${colors.reset}`);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
  
  console.log(`${colors.blue}\n===== FIX APPLIED SUCCESSFULLY =====${colors.reset}`);
  console.log(`${colors.green}To complete the fix, please restart the payment service and API gateway:${colors.reset}`);
  console.log(`
  1. Navigate to payment-service directory: cd ../
  2. Restart the payment service: npm run dev
  3. In another terminal, navigate to api-gateway: cd ../../api-gateway
  4. Restart the API gateway: npm run dev
  `);
}

async function createDefaultPlans() {
  // Create basic plans (Free, Basic, Pro)
  await prisma.plan.create({
    data: {
      name: 'Free',
      description: 'Basic risk assessment features for small teams',
      price: 0,
      currency: 'USD',
      interval: 'monthly',
      features: ['Limited questionnaires', 'Basic reports', 'Email support'],
      isActive: true,
      maxQuestionnaires: 3,
      maxReports: 3
    }
  });
  
  await prisma.plan.create({
    data: {
      name: 'Basic',
      description: 'Standard risk assessment features for growing organizations',
      price: 49.99,
      currency: 'USD',
      interval: 'monthly',
      features: ['Unlimited questionnaires', 'Detailed reports', 'Priority email support', 'Basic benchmark comparison'],
      isActive: true,
      maxQuestionnaires: null,
      maxReports: 20
    }
  });
  
  await prisma.plan.create({
    data: {
      name: 'Pro',
      description: 'Advanced risk assessment features for enterprise organizations',
      price: 99.99,
      currency: 'USD',
      interval: 'monthly',
      features: ['Unlimited questionnaires', 'Advanced reports with recommendations', '24/7 support', 'Advanced benchmark comparison', 'Custom rules engine', 'API access'],
      isActive: true,
      maxQuestionnaires: null,
      maxReports: null
    }
  });
}

applyFix()
  .then(() => {
    console.log(`${colors.green}\nScript completed successfully${colors.reset}`);
    process.exit(0);
  })
  .catch(error => {
    console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
    console.error(error);
    process.exit(1);
  });
