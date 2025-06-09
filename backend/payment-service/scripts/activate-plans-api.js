#!/usr/bin/env node

/**
 * Script to activate plans by using the API directly
 * This avoids Prisma database connection issues
 */

const axios = require('axios');

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

console.log(`${colors.blue}===== PLANS ACTIVATION TOOL =====${colors.reset}`);

// Configuration
const API_PORT = process.env.PORT || 5003;
const API_BASE_URL = `http://localhost:${API_PORT}/api`;

// Get admin credentials - in a real world scenario, this would be more secure
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'admin-token';

async function main() {
  console.log(`${colors.blue}Starting plan activation at ${new Date().toISOString()}${colors.reset}\n`);

  try {
    // 1. Get all plans to identify which ones need activation
    console.log(`${colors.cyan}[1/3] Fetching all plans...${colors.reset}`);
    
    let plans = [];
    try {
      const response = await axios.get(`${API_BASE_URL}/plans`);
      plans = response.data.data || [];
      console.log(`${colors.green}✓ Found ${plans.length} plans${colors.reset}`);
      
      // Display plan details
      plans.forEach(plan => {
        console.log(`  - Plan #${plan.id}: ${plan.name}`);
        console.log(`    Active: ${plan.isActive ? '✓ Yes' : '✗ No'}`);
      });
    } catch (error) {
      console.error(`${colors.red}Error fetching plans: ${error.message}${colors.reset}`);
      if (error.response) {
        console.error(`${colors.red}Response status: ${error.response.status}${colors.reset}`);
        console.error(`${colors.red}Response data: ${JSON.stringify(error.response.data)}${colors.reset}`);
      }
      throw new Error('Failed to fetch plans');
    }
    
    if (plans.length === 0) {
      console.log(`${colors.yellow}⚠ No plans found. Nothing to activate.${colors.reset}`);
      return;
    }

    // 2. Activate each inactive plan
    console.log(`\n${colors.cyan}[2/3] Activating inactive plans...${colors.reset}`);
    
    const inactivePlans = plans.filter(plan => !plan.isActive);
    if (inactivePlans.length === 0) {
      console.log(`${colors.green}✓ All plans are already active${colors.reset}`);
    } else {
      console.log(`${colors.yellow}Found ${inactivePlans.length} inactive plans to activate${colors.reset}`);
      
      for (const plan of inactivePlans) {
        try {
          console.log(`${colors.cyan}Activating plan: ${plan.name} (ID: ${plan.id})${colors.reset}`);
          
          // Update the plan to set isActive = true
          await axios.put(`${API_BASE_URL}/plans/${plan.id}`, 
            { isActive: true },
            { 
              headers: { 
                'Authorization': `Bearer ${ADMIN_TOKEN}`,
                'Content-Type': 'application/json'
              }
            }
          );
          
          console.log(`${colors.green}✓ Successfully activated plan: ${plan.name}${colors.reset}`);
        } catch (error) {
          console.error(`${colors.red}Error activating plan ${plan.name}: ${error.message}${colors.reset}`);
          if (error.response) {
            console.error(`${colors.red}Response status: ${error.response.status}${colors.reset}`);
            console.error(`${colors.red}Response data: ${JSON.stringify(error.response.data)}${colors.reset}`);
          }
          console.log(`${colors.yellow}⚠ Continuing with next plan...${colors.reset}`);
        }
      }
    }

    // 3. Verify all plans are now active
    console.log(`\n${colors.cyan}[3/3] Verifying plan activation...${colors.reset}`);
    
    try {
      const verifyResponse = await axios.get(`${API_BASE_URL}/plans`);
      const updatedPlans = verifyResponse.data.data || [];
      
      const stillInactivePlans = updatedPlans.filter(plan => !plan.isActive);
      
      if (stillInactivePlans.length === 0) {
        console.log(`${colors.green}✓ All plans are now active${colors.reset}`);
      } else {
        console.log(`${colors.yellow}⚠ ${stillInactivePlans.length} plans are still inactive${colors.reset}`);
        stillInactivePlans.forEach(plan => {
          console.log(`  - ${plan.name} (ID: ${plan.id})`);
        });
        console.log(`${colors.yellow}Manual intervention may be required${colors.reset}`);
      }
    } catch (error) {
      console.error(`${colors.red}Error verifying plan activation: ${error.message}${colors.reset}`);
    }

    // Summary
    console.log(`\n${colors.blue}===== ACTIVATION COMPLETE =====${colors.reset}`);
    console.log(`${colors.cyan}Next steps:${colors.reset}`);
    console.log(`1. Restart the payment service using: npm run restart`);
    console.log(`2. Restart the API gateway service`);
    console.log(`3. Clear your browser cache and refresh the Plans page`);

  } catch (error) {
    console.error(`${colors.red}Error during activation process: ${error.message}${colors.reset}`);
    console.error(`${colors.yellow}Activation process incomplete. Please resolve the issues and try again.${colors.reset}`);
    process.exit(1);
  }
}

main().catch(e => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, e);
  process.exit(1);
});
