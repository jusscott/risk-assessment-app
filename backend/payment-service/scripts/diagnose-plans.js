#!/usr/bin/env node

/**
 * Diagnostic script for subscription plans functionality
 * This script performs comprehensive checks to identify issues with plans
 * and suggests solutions for any problems found.
 */

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

console.log(`${colors.blue}${colors.bold}===== PLANS DIAGNOSTIC TOOL =====${colors.reset}`);
console.log(`${colors.cyan}Performing comprehensive diagnosis of subscription plans functionality${colors.reset}\n`);

let diagnosisResults = {
  databaseConnection: false,
  environmentVariables: false,
  databaseSchema: false,
  plansExist: false,
  activeFlagExists: false,
  allPlansActive: false,
  apiEndpoint: false,
  apiGatewayConfig: false
};

let issues = [];
let prisma;
let axios;

// Load environment variables
try {
  console.log(`${colors.cyan}[1/8] Checking environment variables...${colors.reset}`);
  require('dotenv').config({ path: __dirname + '/../.env' });
  
  if (process.env.DATABASE_URL) {
    console.log(`${colors.green}✓ DATABASE_URL is set: ${process.env.DATABASE_URL}${colors.reset}`);
    diagnosisResults.environmentVariables = true;
  } else {
    console.log(`${colors.red}✗ DATABASE_URL environment variable not found${colors.reset}`);
    issues.push("Missing DATABASE_URL environment variable");
    
    // Set a default URL for further diagnostics
    process.env.DATABASE_URL = "postgresql://postgres:postgres123@localhost:5432/payment_db?schema=public";
    console.log(`${colors.yellow}⚠ Setting default DATABASE_URL for diagnosis: ${process.env.DATABASE_URL}${colors.reset}`);
  }
} catch (error) {
  console.error(`${colors.red}✗ Error loading environment variables: ${error.message}${colors.reset}`);
  issues.push(`Error loading environment variables: ${error.message}`);
  
  // Set a default URL for further diagnostics
  process.env.DATABASE_URL = "postgresql://postgres:postgres123@localhost:5432/payment_db?schema=public";
  console.log(`${colors.yellow}⚠ Setting default DATABASE_URL for diagnosis: ${process.env.DATABASE_URL}${colors.reset}`);
}

// Check database connectivity
async function checkDatabaseConnection() {
  console.log(`\n${colors.cyan}[2/8] Checking database connectivity...${colors.reset}`);
  try {
    const { PrismaClient } = require('@prisma/client');
    prisma = new PrismaClient();
    
    // Try a simple query to verify connection
    await prisma.$queryRaw`SELECT 1 as test`;
    
    console.log(`${colors.green}✓ Successfully connected to database${colors.reset}`);
    diagnosisResults.databaseConnection = true;
    return true;
  } catch (error) {
    console.error(`${colors.red}✗ Database connection failed: ${error.message}${colors.reset}`);
    issues.push(`Database connection failed: ${error.message}`);
    
    // Check if this is an authentication error
    if (error.message.includes("Authentication failed")) {
      issues.push("Database authentication failed - check username/password in DATABASE_URL");
      console.log(`${colors.yellow}⚠ Authentication failed - verify PostgreSQL credentials${colors.reset}`);
    }
    
    // Check if this is a "database does not exist" error
    if (error.message.includes("database \"payment_db\" does not exist")) {
      issues.push("Database 'payment_db' does not exist - needs to be created");
      console.log(`${colors.yellow}⚠ Database 'payment_db' doesn't exist - needs to be created${colors.reset}`);
    }
    
    return false;
  }
}

// Check database schema and 'Plan' table
async function checkDatabaseSchema() {
  console.log(`\n${colors.cyan}[3/8] Checking database schema...${colors.reset}`);
  if (!diagnosisResults.databaseConnection) {
    console.log(`${colors.yellow}⚠ Skipping schema check due to database connection failure${colors.reset}`);
    return false;
  }
  
  try {
    // Check if Plan table exists by querying it
    await prisma.plan.findFirst();
    console.log(`${colors.green}✓ 'Plan' table exists in database schema${colors.reset}`);
    diagnosisResults.databaseSchema = true;
    return true;
  } catch (error) {
    console.error(`${colors.red}✗ Error accessing 'Plan' table: ${error.message}${colors.reset}`);
    issues.push(`'Plan' table not found or inaccessible: ${error.message}`);
    
    // Check if this is a "table does not exist" error
    if (error.message.includes("does not exist")) {
      issues.push("'Plan' table doesn't exist - migrations may need to be applied");
      console.log(`${colors.yellow}⚠ 'Plan' table doesn't exist - migrations need to be applied${colors.reset}`);
    }
    
    return false;
  }
}

// Check if plans exist in the database
async function checkPlansExist() {
  console.log(`\n${colors.cyan}[4/8] Checking if plans exist in database...${colors.reset}`);
  if (!diagnosisResults.databaseSchema) {
    console.log(`${colors.yellow}⚠ Skipping plans check due to schema issues${colors.reset}`);
    return false;
  }
  
  try {
    const planCount = await prisma.plan.count();
    if (planCount > 0) {
      console.log(`${colors.green}✓ Found ${planCount} subscription plans in database${colors.reset}`);
      diagnosisResults.plansExist = true;
      return true;
    } else {
      console.log(`${colors.red}✗ No subscription plans found in database${colors.reset}`);
      issues.push("No subscription plans exist in the database");
      return false;
    }
  } catch (error) {
    console.error(`${colors.red}✗ Error checking plans: ${error.message}${colors.reset}`);
    issues.push(`Error checking plans: ${error.message}`);
    return false;
  }
}

// Check if 'active' flag exists in Plan model
async function checkActiveFlagExists() {
  console.log(`\n${colors.cyan}[5/8] Checking if 'active' flag exists in Plan model...${colors.reset}`);
  if (!diagnosisResults.databaseSchema) {
    console.log(`${colors.yellow}⚠ Skipping active flag check due to schema issues${colors.reset}`);
    return false;
  }
  
  try {
    // Get one plan and check if it has an 'active' property
    const plan = await prisma.plan.findFirst({
      select: {
        active: true
      }
    });
    
    if (plan === null) {
      console.log(`${colors.yellow}⚠ Could not check 'active' flag - no plans exist${colors.reset}`);
      return false;
    }
    
    if ('active' in plan) {
      console.log(`${colors.green}✓ 'active' flag exists in Plan model${colors.reset}`);
      diagnosisResults.activeFlagExists = true;
      return true;
    } else {
      console.log(`${colors.red}✗ 'active' flag does not exist in Plan model${colors.reset}`);
      issues.push("'active' flag does not exist in Plan model - migration 20250521_add_active needs to be applied");
      return false;
    }
  } catch (error) {
    if (error.message.includes("Unknown field `active`")) {
      console.log(`${colors.red}✗ 'active' field does not exist in Plan model${colors.reset}`);
      issues.push("'active' field missing - migration 20250521_add_active needs to be applied");
    } else {
      console.error(`${colors.red}✗ Error checking 'active' flag: ${error.message}${colors.reset}`);
      issues.push(`Error checking 'active' flag: ${error.message}`);
    }
    return false;
  }
}

// Check if all plans have active=true
async function checkAllPlansActive() {
  console.log(`\n${colors.cyan}[6/8] Checking if all plans are marked as active...${colors.reset}`);
  if (!diagnosisResults.activeFlagExists) {
    console.log(`${colors.yellow}⚠ Skipping active plans check due to missing 'active' flag${colors.reset}`);
    return false;
  }
  
  try {
    const inactivePlans = await prisma.plan.count({
      where: {
        active: false
      }
    });
    
    if (inactivePlans === 0) {
      console.log(`${colors.green}✓ All plans are marked as active${colors.reset}`);
      diagnosisResults.allPlansActive = true;
      return true;
    } else {
      console.log(`${colors.red}✗ Found ${inactivePlans} inactive plans${colors.reset}`);
      issues.push(`${inactivePlans} plans have active=false and need to be activated`);
      return false;
    }
  } catch (error) {
    console.error(`${colors.red}✗ Error checking plan status: ${error.message}${colors.reset}`);
    issues.push(`Error checking plan status: ${error.message}`);
    return false;
  }
}

// Check API Gateway configuration
async function checkApiGatewayConfig() {
  console.log(`\n${colors.cyan}[7/8] Checking API Gateway configuration...${colors.reset}`);
  
  try {
    const fs = require('fs');
    const path = require('path');
    
    const configPath = path.resolve(__dirname, '../../../api-gateway/src/config/service-url.config.js');
    
    if (fs.existsSync(configPath)) {
      const configContent = fs.readFileSync(configPath, 'utf8');
      
      if (configContent.includes('payment') && configContent.includes('http://')) {
        console.log(`${colors.green}✓ API Gateway configuration includes payment service URL${colors.reset}`);
        diagnosisResults.apiGatewayConfig = true;
        
        // Extract the actual URL for informational purposes
        const match = configContent.match(/payment['"]*:\s*['"]([^'"]+)['"]/);
        if (match && match[1]) {
          console.log(`${colors.cyan}  Payment service URL: ${match[1]}${colors.reset}`);
        }
        
        return true;
      } else {
        console.log(`${colors.red}✗ API Gateway configuration does not include payment service URL${colors.reset}`);
        issues.push("API Gateway configuration missing payment service URL");
        return false;
      }
    } else {
      console.log(`${colors.red}✗ API Gateway configuration file not found${colors.reset}`);
      issues.push("API Gateway configuration file not found");
      return false;
    }
  } catch (error) {
    console.error(`${colors.red}✗ Error checking API Gateway configuration: ${error.message}${colors.reset}`);
    issues.push(`Error checking API Gateway configuration: ${error.message}`);
    return false;
  }
}

// Check API endpoint
async function checkApiEndpoint() {
  console.log(`\n${colors.cyan}[8/8] Checking API endpoint...${colors.reset}`);
  
  try {
    // Try to load the config file
    let config;
    try {
      config = require('../src/config/config');
    } catch (error) {
      console.log(`${colors.yellow}⚠ Could not load config file: ${error.message}${colors.reset}`);
      console.log(`${colors.yellow}  Using default port 5003${colors.reset}`);
      config = { app: { port: 5003 } };
    }
    
    // Try to load axios
    try {
      axios = require('axios');
    } catch (error) {
      console.log(`${colors.red}✗ Could not load axios: ${error.message}${colors.reset}`);
      issues.push("axios package not installed - needed for API testing");
      console.log(`${colors.yellow}  Run 'npm install axios' to install axios${colors.reset}`);
      return false;
    }
    
    const port = config.app.port || 5003;
    const url = `http://localhost:${port}/api/plans`;
    
    console.log(`${colors.cyan}  Testing API endpoint: ${url}${colors.reset}`);
    
    try {
      const response = await axios.get(url, { timeout: 5000 });
      
      if (response.status === 200) {
        if (response.data && response.data.success) {
          const plansCount = response.data.data.length;
          console.log(`${colors.green}✓ API endpoint returned ${plansCount} plans${colors.reset}`);
          diagnosisResults.apiEndpoint = true;
          return true;
        } else {
          console.log(`${colors.red}✗ API returned success=false: ${JSON.stringify(response.data)}${colors.reset}`);
          issues.push("API endpoint returned success=false");
          return false;
        }
      } else {
        console.log(`${colors.red}✗ API returned non-200 status: ${response.status}${colors.reset}`);
        issues.push(`API endpoint returned non-200 status: ${response.status}`);
        return false;
      }
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.log(`${colors.red}✗ Could not connect to API: Connection refused${colors.reset}`);
        issues.push("Payment service is not running");
        console.log(`${colors.yellow}  The payment service needs to be running to test API endpoint${colors.reset}`);
      } else {
        console.log(`${colors.red}✗ Error testing API endpoint: ${error.message}${colors.reset}`);
        issues.push(`Error testing API endpoint: ${error.message}`);
      }
      return false;
    }
  } catch (error) {
    console.error(`${colors.red}✗ Error checking API endpoint: ${error.message}${colors.reset}`);
    issues.push(`Error checking API endpoint: ${error.message}`);
    return false;
  }
}

// Generate diagnostic summary and recommendations
function generateSummary() {
  console.log(`\n${colors.blue}${colors.bold}===== DIAGNOSIS SUMMARY =====${colors.reset}`);
  
  // Count passed checks
  const passedChecks = Object.values(diagnosisResults).filter(result => result).length;
  const totalChecks = Object.keys(diagnosisResults).length;
  
  console.log(`\n${colors.cyan}${passedChecks} out of ${totalChecks} checks passed${colors.reset}`);
  
  if (passedChecks === totalChecks) {
    console.log(`\n${colors.green}${colors.bold}✓ All checks passed! Plans functionality should be working correctly.${colors.reset}`);
    return;
  }
  
  console.log(`\n${colors.red}${colors.bold}Issues detected:${colors.reset}`);
  issues.forEach((issue, index) => {
    console.log(`${colors.red}${index + 1}. ${issue}${colors.reset}`);
  });
  
  console.log(`\n${colors.blue}${colors.bold}Recommended actions:${colors.reset}`);
  
  // Database connection issues
  if (!diagnosisResults.databaseConnection || !diagnosisResults.environmentVariables) {
    console.log(`\n${colors.yellow}1. Fix database connection:${colors.reset}`);
    console.log(`   - Ensure PostgreSQL is running`);
    console.log(`   - Check username and password in .env file`);
    console.log(`   - Verify database 'payment_db' exists`);
    console.log(`   - Current connection string: ${process.env.DATABASE_URL}`);
  }
  
  // Schema and migration issues
  if (!diagnosisResults.databaseSchema || !diagnosisResults.activeFlagExists) {
    console.log(`\n${colors.yellow}2. Apply database migrations:${colors.reset}`);
    console.log(`   - Run: cd backend/payment-service && npx prisma migrate deploy`);
    console.log(`   - Ensure migration '20250521_add_active' is applied`);
  }
  
  // Missing plans
  if (!diagnosisResults.plansExist) {
    console.log(`\n${colors.yellow}3. Create subscription plans:${colors.reset}`);
    console.log(`   - Run: node backend/payment-service/scripts/fix-plans-issue.js`);
  }
  
  // Inactive plans
  if (diagnosisResults.plansExist && !diagnosisResults.allPlansActive) {
    console.log(`\n${colors.yellow}4. Activate existing plans:${colors.reset}`);
    console.log(`   - Run: node backend/payment-service/scripts/fix-plans-issue.js`);
  }
  
  // API endpoint issues
  if (!diagnosisResults.apiEndpoint) {
    console.log(`\n${colors.yellow}5. Fix API endpoint:${colors.reset}`);
    console.log(`   - Ensure payment service is running`);
    console.log(`   - Check payment service logs for errors`);
    console.log(`   - Restart payment service: cd backend/payment-service && npm run restart`);
  }
  
  // API Gateway issues
  if (!diagnosisResults.apiGatewayConfig) {
    console.log(`\n${colors.yellow}6. Fix API Gateway configuration:${colors.reset}`);
    console.log(`   - Check URL in backend/api-gateway/src/config/service-url.config.js`);
    console.log(`   - Ensure payment service URL is correct`);
    console.log(`   - Restart API Gateway: cd backend/api-gateway && node scripts/restart-gateway.sh`);
  }
}

// Main function
async function main() {
  try {
    await checkDatabaseConnection();
    await checkDatabaseSchema();
    await checkPlansExist();
    await checkActiveFlagExists();
    await checkAllPlansActive();
    await checkApiGatewayConfig();
    await checkApiEndpoint();
    
    generateSummary();
  } catch (error) {
    console.error(`${colors.red}Fatal error during diagnosis: ${error.message}${colors.reset}`);
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
