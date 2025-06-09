/**
 * Database Connection Fix Script
 * 
 * This script diagnoses and fixes database connection issues for the questionnaire service.
 * It detects whether we're running in Docker or on the host machine and adjusts the DATABASE_URL
 * accordingly to ensure proper connectivity.
 */
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

// Colors for console output
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

// Environment files
const ENV_DEV_PATH = path.join(__dirname, '..', '.env.development');
const ENV_PATH = path.join(__dirname, '..', '.env');
const ENV_LOCAL_PATH = path.join(__dirname, '..', '.env.local');

// Create temp Prisma client
let prisma;

/**
 * Check if running in Docker
 */
function isDocker() {
  return fs.existsSync('/.dockerenv');
}

/**
 * Get all environment file paths
 */
function getEnvFilePaths() {
  const paths = [];
  if (fs.existsSync(ENV_DEV_PATH)) paths.push(ENV_DEV_PATH);
  if (fs.existsSync(ENV_PATH)) paths.push(ENV_PATH);
  if (fs.existsSync(ENV_LOCAL_PATH)) paths.push(ENV_LOCAL_PATH);
  return paths;
}

/**
 * Parse an environment file to get its variables
 */
function parseEnvFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const envVars = {};
  
  content.split('\n').forEach(line => {
    // Skip comments and empty lines
    if (line.startsWith('#') || line.trim() === '') return;
    
    // Parse key=value pairs
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      
      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.substring(1, value.length - 1);
      }
      
      envVars[key] = value;
    }
  });
  
  return envVars;
}

/**
 * Update an environment file with new variables
 */
function updateEnvFile(filePath, updates) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Apply each update
  Object.entries(updates).forEach(([key, value]) => {
    // Check if the key exists in the file
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (regex.test(content)) {
      // Update existing key
      content = content.replace(regex, `${key}="${value}"`);
    } else {
      // Add new key
      content += `\n${key}="${value}"`;
    }
  });
  
  // Write the updated content
  fs.writeFileSync(filePath, content);
  console.log(`${GREEN}Updated ${filePath}${RESET}`);
}

/**
 * Fix the database URL in environment files
 */
function fixDatabaseUrl(filePath, currentUrl) {
  console.log(`${YELLOW}Analyzing database URL in ${path.basename(filePath)}...${RESET}`);
  
  let fixedUrl = currentUrl;
  
  // If we're not in Docker and the URL uses Docker hostnames, convert to localhost
  if (!isDocker() && (
    currentUrl.includes('questionnaire-db') || 
    currentUrl.includes('postgres-db') ||
    currentUrl.includes('db:5432')
  )) {
    // Replace Docker hostnames with localhost
    fixedUrl = currentUrl
      .replace('questionnaire-db:5432', 'localhost:5433')
      .replace('postgres-db:5432', 'localhost:5433')
      .replace('db:5432', 'localhost:5433');
    
    console.log(`${YELLOW}Converting Docker database URL to localhost:${RESET}`);
    console.log(`${BLUE}Original: ${currentUrl}${RESET}`);
    console.log(`${GREEN}Fixed:    ${fixedUrl}${RESET}`);
    
    // Update the file
    updateEnvFile(filePath, { DATABASE_URL: fixedUrl });
  } else {
    console.log(`${GREEN}Database URL looks correct: ${currentUrl}${RESET}`);
  }
  
  return fixedUrl;
}

/**
 * Create a temporary .env.local file for local development
 */
function createLocalEnvFile(databaseUrl) {
  console.log(`${YELLOW}Creating .env.local file for local development...${RESET}`);
  
  const content = `# Local development environment variables
# Created by fix-database-connection.js
DATABASE_URL="${databaseUrl}"
`;
  
  fs.writeFileSync(ENV_LOCAL_PATH, content);
  console.log(`${GREEN}Created ${ENV_LOCAL_PATH}${RESET}`);
}

/**
 * Test database connection
 */
async function testDatabaseConnection(databaseUrl) {
  console.log(`${YELLOW}Testing database connection to: ${databaseUrl}${RESET}`);
  
  // Set DATABASE_URL environment variable for Prisma
  process.env.DATABASE_URL = databaseUrl;
  
  // Create a new Prisma client
  prisma = new PrismaClient();
  
  try {
    // Try to connect to the database
    await prisma.$queryRaw`SELECT 1`;
    console.log(`${GREEN}✓ Database connection successful!${RESET}`);
    return true;
  } catch (error) {
    console.error(`${RED}✗ Database connection failed: ${error.message}${RESET}`);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Main function to diagnose and fix database connection issues
 */
async function diagnoseAndFixDatabaseConnection() {
  console.log(`${BLUE}=======================================`);
  console.log(`DATABASE CONNECTION DIAGNOSIS AND FIX`);
  console.log(`=======================================${RESET}`);
  
  // Check if running in Docker
  console.log(`${YELLOW}Running in Docker environment: ${isDocker() ? 'Yes' : 'No'}${RESET}`);
  
  // Get environment files
  const envFiles = getEnvFilePaths();
  console.log(`${YELLOW}Found ${envFiles.length} environment files: ${envFiles.map(p => path.basename(p)).join(', ')}${RESET}`);
  
  if (envFiles.length === 0) {
    console.error(`${RED}No environment files found!${RESET}`);
    console.log(`${YELLOW}Please create a .env.development file with DATABASE_URL defined.${RESET}`);
    return false;
  }
  
  // Process each environment file
  let fixedUrl = null;
  let connectionSuccess = false;
  
  for (const envFile of envFiles) {
    const envVars = parseEnvFile(envFile);
    
    if (envVars.DATABASE_URL) {
      // Fix database URL
      const newUrl = fixDatabaseUrl(envFile, envVars.DATABASE_URL);
      fixedUrl = newUrl;
      
      // Test the connection
      connectionSuccess = await testDatabaseConnection(newUrl);
      if (connectionSuccess) break;
    } else {
      console.log(`${YELLOW}No DATABASE_URL found in ${path.basename(envFile)}${RESET}`);
    }
  }
  
  // If we still don't have a working connection, try alternative configurations
  if (!connectionSuccess && fixedUrl) {
    console.log(`${YELLOW}Trying alternative database configurations...${RESET}`);
    
    // Try with local PostgreSQL default port
    const localUrl = fixedUrl.replace(/localhost:\d+/, 'localhost:5433');
    console.log(`${YELLOW}Trying: ${localUrl}${RESET}`);
    connectionSuccess = await testDatabaseConnection(localUrl);
    
    if (connectionSuccess) {
      fixedUrl = localUrl;
      // Create a local env file with the working URL
      createLocalEnvFile(fixedUrl);
    }
  }
  
  // Final report
  console.log(`${BLUE}\n=======================================`);
  if (connectionSuccess) {
    console.log(`${GREEN}DATABASE CONNECTION FIXED SUCCESSFULLY!${RESET}`);
    console.log(`${GREEN}Working database URL: ${fixedUrl}${RESET}`);
  } else {
    console.log(`${RED}DATABASE CONNECTION ISSUES PERSIST${RESET}`);
    console.log(`${YELLOW}Please check the following:${RESET}`);
    console.log(`1. Is PostgreSQL running?`);
    console.log(`2. Is the database 'questionnaires' created?`);
    console.log(`3. Are the username and password correct?`);
    console.log(`4. Is the port correct? (default is 5432)`);
    console.log(`\n${YELLOW}You can manually update the DATABASE_URL in .env.development:${RESET}`);
    console.log(`DATABASE_URL="postgresql://postgres:password@localhost:5433/questionnaires"`);
  }
  console.log(`${BLUE}=======================================\n${RESET}`);
  
  return connectionSuccess;
}

// Execute the main function
diagnoseAndFixDatabaseConnection()
  .then(success => {
    if (success) {
      console.log(`${GREEN}You can now run the template fix scripts again.${RESET}`);
    } else {
      console.log(`${YELLOW}Please fix the database connection issues before proceeding.${RESET}`);
    }
  })
  .catch(error => {
    console.error(`${RED}Error during diagnosis:${RESET}`, error);
  });
