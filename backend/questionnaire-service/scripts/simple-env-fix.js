/**
 * Simple Environment Fix Script
 * 
 * This script directly fixes environment variable issues by:
 * 1. Creating a .env file in the prisma directory specifically
 * 2. Setting up environment variables for the database connection
 */

const fs = require('fs');
const path = require('path');

// Colors for console output
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

// Database connection string
const DATABASE_URL = "postgresql://postgres:password@localhost:5433/questionnaires";

// Define paths
const rootDir = path.join(__dirname, '..');
const prismaDir = path.join(rootDir, 'prisma');
const envPath = path.join(rootDir, '.env');
const envLocalPath = path.join(rootDir, '.env.local');
const envDevPath = path.join(rootDir, '.env.development');
const prismaDotEnvPath = path.join(prismaDir, '.env');

console.log(`${BLUE}=======================================`);
console.log(`DIRECT ENVIRONMENT VARIABLE FIX`);
console.log(`=======================================${RESET}`);

console.log(`${YELLOW}Using database URL: ${DATABASE_URL}${RESET}`);

// Create or update .env files
function updateEnvFile(filePath, vars) {
  console.log(`${BLUE}Updating ${filePath}...${RESET}`);
  
  let content = '';
  
  // If file exists, read it
  if (fs.existsSync(filePath)) {
    content = fs.readFileSync(filePath, 'utf8');
    console.log(`${YELLOW}Existing file found.${RESET}`);
  } else {
    console.log(`${YELLOW}Creating new file.${RESET}`);
  }
  
  // Update each variable
  for (const [key, value] of Object.entries(vars)) {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    
    if (regex.test(content)) {
      // Update existing variable
      content = content.replace(regex, `${key}="${value}"`);
      console.log(`${GREEN}Updated ${key} in ${filePath}${RESET}`);
    } else {
      // Add new variable
      content += `\n${key}="${value}"`;
      console.log(`${GREEN}Added ${key} to ${filePath}${RESET}`);
    }
  }
  
  // Write the updated content
  fs.writeFileSync(filePath, content);
  console.log(`${GREEN}Successfully updated ${filePath}${RESET}`);
}

// Make sure all required variables are set in .env files
const envVars = {
  DATABASE_URL: DATABASE_URL
};

// Create directory if it doesn't exist
function ensureDirExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    console.log(`${YELLOW}Creating directory: ${dirPath}${RESET}`);
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// Ensure prisma directory exists
ensureDirExists(prismaDir);

// Update all environment files
updateEnvFile(envPath, envVars);
updateEnvFile(envLocalPath, envVars);
updateEnvFile(envDevPath, envVars);

// Create a special .env file in the prisma directory
// This is important because Prisma looks for .env files in the same directory as schema.prisma
console.log(`${BLUE}Creating Prisma-specific .env file...${RESET}`);
updateEnvFile(prismaDotEnvPath, envVars);

console.log(`${BLUE}Environment variable fix complete.${RESET}`);
console.log(`${GREEN}DATABASE_URL is now set to: ${DATABASE_URL}${RESET}`);
console.log(`${YELLOW}Next steps:${RESET}`);
console.log(`1. Create the 'questionnaires' database with the following command:`);
console.log(`   ${BLUE}createdb -U postgres questionnaires${RESET}`);
console.log(`2. Run the Prisma migration commands:`);
console.log(`   ${BLUE}npx prisma migrate dev --name init${RESET}`);
console.log(`3. Run the template fix script again:`);
console.log(`   ${BLUE}./scripts/fix-template-issues.sh${RESET}`);

console.log(`${GREEN}=======================================`);
console.log(`ENVIRONMENT VARIABLES FIXED SUCCESSFULLY!`);
console.log(`=======================================${RESET}`);
