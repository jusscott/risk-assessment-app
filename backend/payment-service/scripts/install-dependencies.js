#!/usr/bin/env node

/**
 * Dependency Installation Script for Plans Functionality
 * This script checks for and installs required dependencies needed for
 * diagnosing and fixing subscription plans issues.
 */

const { execSync } = require('child_process');
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

console.log(`${colors.blue}${colors.bold}===== DEPENDENCY INSTALLATION TOOL =====${colors.reset}`);
console.log(`${colors.cyan}Installing required dependencies for plans functionality${colors.reset}\n`);

// Required dependencies
const requiredDependencies = [
  { name: 'dotenv', version: '^16.0.0', purpose: 'Loading environment variables' },
  { name: '@prisma/client', version: '^4.0.0', purpose: 'Database access' },
  { name: 'axios', version: '^1.0.0', purpose: 'API testing' }
];

// Service directory path
const serviceDir = path.resolve(__dirname, '..');

// Check if package.json exists
function checkPackageJson() {
  console.log(`${colors.cyan}[1/5] Checking package.json...${colors.reset}`);
  
  const packageJsonPath = path.join(serviceDir, 'package.json');
  
  if (fs.existsSync(packageJsonPath)) {
    console.log(`${colors.green}✓ package.json found at ${packageJsonPath}${colors.reset}`);
    return true;
  } else {
    console.log(`${colors.red}✗ package.json not found at ${packageJsonPath}${colors.reset}`);
    console.log(`${colors.yellow}Creating a basic package.json file${colors.reset}`);
    
    const basicPackageJson = {
      name: 'payment-service',
      version: '1.0.0',
      description: 'Payment service for Risk Assessment App',
      main: 'src/index.js',
      scripts: {
        start: 'node src/index.js',
        restart: 'npm run stop && npm run start',
        stop: 'pkill -f "node src/index.js" || true'
      },
      dependencies: {}
    };
    
    fs.writeFileSync(packageJsonPath, JSON.stringify(basicPackageJson, null, 2));
    console.log(`${colors.green}✓ Created basic package.json${colors.reset}`);
    return true;
  }
}

// Check and install dependencies
function installDependencies() {
  console.log(`\n${colors.cyan}[2/5] Checking and installing required dependencies...${colors.reset}`);
  
  const packageJsonPath = path.join(serviceDir, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  const dependencies = packageJson.dependencies || {};
  const missingDependencies = [];
  
  // Check which dependencies are missing
  requiredDependencies.forEach(dep => {
    if (!dependencies[dep.name]) {
      console.log(`${colors.yellow}⚠ Missing dependency: ${dep.name} (${dep.purpose})${colors.reset}`);
      missingDependencies.push(dep);
    } else {
      console.log(`${colors.green}✓ Dependency already installed: ${dep.name}${colors.reset}`);
    }
  });
  
  // Install missing dependencies
  if (missingDependencies.length > 0) {
    console.log(`\n${colors.cyan}Installing missing dependencies...${colors.reset}`);
    
    const installCommands = missingDependencies.map(dep => `${dep.name}@${dep.version}`).join(' ');
    
    try {
      console.log(`${colors.cyan}> npm install ${installCommands}${colors.reset}`);
      execSync(`npm install ${installCommands}`, { cwd: serviceDir, stdio: 'inherit' });
      console.log(`${colors.green}✓ Successfully installed missing dependencies${colors.reset}`);
    } catch (error) {
      console.error(`${colors.red}✗ Error installing dependencies: ${error.message}${colors.reset}`);
      console.log(`${colors.yellow}Please install them manually using:${colors.reset}`);
      console.log(`${colors.yellow}cd ${serviceDir} && npm install ${installCommands}${colors.reset}`);
    }
  } else {
    console.log(`${colors.green}✓ All required dependencies are installed${colors.reset}`);
  }
  
  return true;
}

// Check Prisma schema
function checkPrismaSchema() {
  console.log(`\n${colors.cyan}[3/5] Checking Prisma schema...${colors.reset}`);
  
  const prismaDir = path.join(serviceDir, 'prisma');
  const prismaSchemaPath = path.join(prismaDir, 'schema.prisma');
  
  if (fs.existsSync(prismaSchemaPath)) {
    console.log(`${colors.green}✓ Prisma schema found at ${prismaSchemaPath}${colors.reset}`);
    return true;
  } else {
    console.log(`${colors.yellow}⚠ Prisma schema not found at ${prismaSchemaPath}${colors.reset}`);
    console.log(`${colors.yellow}This might cause issues with database operations${colors.reset}`);
    console.log(`${colors.yellow}Please make sure the schema.prisma file exists in the prisma directory${colors.reset}`);
    return false;
  }
}

// Generate Prisma client
function generatePrismaClient() {
  console.log(`\n${colors.cyan}[4/5] Generating Prisma client...${colors.reset}`);
  
  try {
    console.log(`${colors.cyan}> npx prisma generate${colors.reset}`);
    execSync('npx prisma generate', { cwd: serviceDir, stdio: 'inherit' });
    console.log(`${colors.green}✓ Successfully generated Prisma client${colors.reset}`);
    return true;
  } catch (error) {
    console.error(`${colors.red}✗ Error generating Prisma client: ${error.message}${colors.reset}`);
    console.log(`${colors.yellow}Please generate it manually using:${colors.reset}`);
    console.log(`${colors.yellow}cd ${serviceDir} && npx prisma generate${colors.reset}`);
    return false;
  }
}

// Check environment file
function checkEnvironmentFile() {
  console.log(`\n${colors.cyan}[5/5] Checking environment file...${colors.reset}`);
  
  const envPath = path.join(serviceDir, '.env');
  
  if (fs.existsSync(envPath)) {
    console.log(`${colors.green}✓ Environment file found at ${envPath}${colors.reset}`);
    
    // Check if it contains DATABASE_URL
    const envContent = fs.readFileSync(envPath, 'utf8');
    if (envContent.includes('DATABASE_URL')) {
      console.log(`${colors.green}✓ DATABASE_URL found in .env file${colors.reset}`);
    } else {
      console.log(`${colors.yellow}⚠ DATABASE_URL not found in .env file${colors.reset}`);
      console.log(`${colors.yellow}Adding DATABASE_URL to .env file${colors.reset}`);
      
      const dbUrl = "DATABASE_URL=\"postgresql://postgres:postgres123@localhost:5432/payment_db?schema=public\"\n";
      fs.appendFileSync(envPath, `\n# Added by install-dependencies.js\n${dbUrl}`);
      
      console.log(`${colors.green}✓ Added DATABASE_URL to .env file${colors.reset}`);
    }
  } else {
    console.log(`${colors.yellow}⚠ Environment file not found at ${envPath}${colors.reset}`);
    console.log(`${colors.yellow}Creating .env file with DATABASE_URL${colors.reset}`);
    
    const envContent = `# Payment service environment configuration

# Database connection string
DATABASE_URL="postgresql://postgres:postgres123@localhost:5432/payment_db?schema=public"

# Application settings
PORT=5003
NODE_ENV=development

# JWT Secret (should match auth service)
JWT_SECRET=RiskAssessmentAppSecretKey2025

# Logging level (debug, info, warn, error)
LOG_LEVEL=info

# API settings
API_VERSION=v1
API_PREFIX=/api
`;
    
    fs.writeFileSync(envPath, envContent);
    console.log(`${colors.green}✓ Created .env file with DATABASE_URL${colors.reset}`);
  }
  
  return true;
}

// Generate summary
function generateSummary(results) {
  console.log(`\n${colors.blue}${colors.bold}===== INSTALLATION SUMMARY =====${colors.reset}`);
  
  // Count successful steps
  const successCount = Object.values(results).filter(result => result).length;
  const totalSteps = Object.keys(results).length;
  
  console.log(`\n${colors.cyan}${successCount} out of ${totalSteps} steps completed successfully${colors.reset}`);
  
  if (successCount === totalSteps) {
    console.log(`\n${colors.green}${colors.bold}✓ All dependencies and configurations are ready!${colors.reset}`);
    console.log(`\n${colors.green}You can now run the diagnosis and fix scripts:${colors.reset}`);
    console.log(`  1. ${colors.cyan}node ${path.relative(process.cwd(), path.join(__dirname, 'diagnose-plans.js'))}${colors.reset}`);
    console.log(`  2. ${colors.cyan}node ${path.relative(process.cwd(), path.join(__dirname, 'fix-plans-issue.js'))}${colors.reset}`);
  } else {
    console.log(`\n${colors.yellow}${colors.bold}⚠ Some steps failed. Please address the issues before running the scripts.${colors.reset}`);
    
    // List failed steps
    Object.entries(results).forEach(([step, success]) => {
      if (!success) {
        console.log(`  ${colors.red}✗ Failed: ${step}${colors.reset}`);
      }
    });
  }
}

// Main function
function main() {
  const results = {
    'package.json': false,
    'dependencies': false,
    'prisma schema': false,
    'prisma client': false,
    'environment file': false
  };
  
  try {
    results['package.json'] = checkPackageJson();
    results['dependencies'] = installDependencies();
    results['prisma schema'] = checkPrismaSchema();
    results['prisma client'] = generatePrismaClient();
    results['environment file'] = checkEnvironmentFile();
    
    generateSummary(results);
  } catch (error) {
    console.error(`${colors.red}Fatal error during installation: ${error.message}${colors.reset}`);
  }
}

// Run the main function
main();
