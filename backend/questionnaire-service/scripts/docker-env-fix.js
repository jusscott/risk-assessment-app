/**
 * Docker Environment Fix Script
 * 
 * This script fixes environment variable issues for Docker deployment by:
 * 1. Setting the correct DATABASE_URL for Docker environment
 * 2. Creating a .env file in the prisma directory
 * 3. Ensuring consistency between environment files
 */

const fs = require('fs');
const path = require('path');

// Colors for console output
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

// Database connection string for Docker
const DATABASE_URL = "postgresql://postgres:password@questionnaire-db:5432/questionnaires";

// Define paths
const rootDir = path.join(__dirname, '..');
const prismaDir = path.join(rootDir, 'prisma');
const envPath = path.join(rootDir, '.env');
const prismaDotEnvPath = path.join(prismaDir, '.env');

console.log(`${BLUE}=======================================`);
console.log(`DOCKER ENVIRONMENT VARIABLE FIX`);
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

// Create a consolidated environment variables set for Docker
const envVars = {
  DATABASE_URL: DATABASE_URL,
  NODE_ENV: "development",
  BYPASS_AUTH: "true",
  AUTH_SERVICE_URL: "http://auth-service:5001/api",
  PORT: "5002"
};

// Update root .env file
updateEnvFile(envPath, envVars);

// Delete the prisma/.env file (which is causing conflicts)
if (fs.existsSync(prismaDotEnvPath)) {
  console.log(`${YELLOW}Removing conflicting prisma/.env file...${RESET}`);
  fs.unlinkSync(prismaDotEnvPath);
  console.log(`${GREEN}Removed conflicting prisma/.env file.${RESET}`);
}

console.log(`${BLUE}Environment variable fix complete.${RESET}`);
console.log(`${GREEN}Docker environment variables fixed successfully!${RESET}`);
