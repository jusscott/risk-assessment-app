/**
 * Direct Database Fix Script
 * 
 * This script directly fixes the database connection issue by:
 * 1. Explicitly setting the DATABASE_URL environment variable
 * 2. Creating the 'questionnaires' database if it doesn't exist
 * 3. Testing the connection
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const fs = require('fs');
const path = require('path');

// Colors for console output
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

// Database connection string (use localhost for local development)
const DATABASE_URL = "postgresql://postgres:password@localhost:5433/questionnaires";

// Store the original DATABASE_URL
const originalDatabaseUrl = process.env.DATABASE_URL;

// Set DATABASE_URL explicitly in the current process
process.env.DATABASE_URL = DATABASE_URL;

/**
 * Create the database if it doesn't exist
 */
async function createDatabaseIfNotExists() {
  try {
    console.log(`${BLUE}Checking if database 'questionnaires' exists...${RESET}`);
    
    // Connect to postgres database to check if our target database exists
    const pgConnectionString = DATABASE_URL.replace('questionnaires', 'postgres');
    
    // Use psql to check if database exists
    try {
      await execAsync(`psql "${pgConnectionString}" -c "SELECT 1 FROM pg_database WHERE datname='questionnaires'"`, { timeout: 5000 });
      console.log(`${GREEN}Database 'questionnaires' exists.${RESET}`);
    } catch (error) {
      console.log(`${YELLOW}Database 'questionnaires' does not exist. Creating it...${RESET}`);
      
      try {
        // Create the database
        await execAsync(`psql "${pgConnectionString}" -c "CREATE DATABASE questionnaires"`, { timeout: 5000 });
        console.log(`${GREEN}Successfully created database 'questionnaires'.${RESET}`);
      } catch (createError) {
        console.error(`${RED}Failed to create database: ${createError.message}${RESET}`);
        
        // Try another approach using createdb if psql fails
        try {
          await execAsync(`createdb -U postgres -h localhost questionnaires`, { timeout: 5000 });
          console.log(`${GREEN}Successfully created database 'questionnaires' using createdb.${RESET}`);
        } catch (createdbError) {
          console.error(`${RED}Failed to create database using createdb: ${createdbError.message}${RESET}`);
          return false;
        }
      }
    }
    
    return true;
  } catch (error) {
    console.error(`${RED}Error checking/creating database: ${error.message}${RESET}`);
    return false;
  }
}

/**
 * Test database connection with Prisma
 */
async function testDatabaseConnection() {
  try {
    console.log(`${BLUE}Testing database connection with Prisma...${RESET}`);
    
    // Import PrismaClient
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    // Try a simple query
    await prisma.$queryRaw`SELECT 1`;
    console.log(`${GREEN}Database connection successful!${RESET}`);
    
    // Disconnect
    await prisma.$disconnect();
    return true;
  } catch (error) {
    console.error(`${RED}Database connection failed: ${error.message}${RESET}`);
    return false;
  }
}

/**
 * Update all .env files with the working DATABASE_URL
 */
function updateEnvFiles() {
  const envFiles = [
    path.join(__dirname, '..', '.env'),
    path.join(__dirname, '..', '.env.development'),
    path.join(__dirname, '..', '.env.local')
  ];
  
  console.log(`${BLUE}Updating environment files with working DATABASE_URL...${RESET}`);
  
  for (const envFile of envFiles) {
    if (fs.existsSync(envFile)) {
      try {
        let content = fs.readFileSync(envFile, 'utf8');
        
        // Check if DATABASE_URL exists in the file
        const regex = new RegExp(`^DATABASE_URL=.*$`, 'm');
        if (regex.test(content)) {
          // Update existing DATABASE_URL
          content = content.replace(regex, `DATABASE_URL="${DATABASE_URL}"`);
        } else {
          // Add DATABASE_URL if it doesn't exist
          content += `\nDATABASE_URL="${DATABASE_URL}"\n`;
        }
        
        // Write the updated content
        fs.writeFileSync(envFile, content);
        console.log(`${GREEN}Updated ${envFile}${RESET}`);
      } catch (error) {
        console.error(`${RED}Error updating ${envFile}: ${error.message}${RESET}`);
      }
    }
  }
}

/**
 * Main function
 */
async function main() {
  console.log(`${BLUE}=======================================`);
  console.log(`DIRECT DATABASE CONNECTION FIX`);
  console.log(`=======================================${RESET}`);
  
  console.log(`${YELLOW}Using database URL: ${DATABASE_URL}${RESET}`);
  
  // Step 1: Create database if it doesn't exist
  const dbCreated = await createDatabaseIfNotExists();
  if (!dbCreated) {
    console.error(`${RED}Failed to create/verify database. Please check PostgreSQL installation.${RESET}`);
    console.log(`${YELLOW}Make sure PostgreSQL is running and accessible.${RESET}`);
    return false;
  }
  
  // Step 2: Test database connection
  const connectionSuccess = await testDatabaseConnection();
  if (!connectionSuccess) {
    console.error(`${RED}Failed to connect to database with Prisma.${RESET}`);
    console.log(`${YELLOW}Please check database credentials and try again.${RESET}`);
    return false;
  }
  
  // Step 3: Update all .env files
  updateEnvFiles();
  
  console.log(`${GREEN}=======================================`);
  console.log(`DATABASE CONNECTION FIXED SUCCESSFULLY!`);
  console.log(`=======================================${RESET}`);
  
  return true;
}

// Run the main function
main()
  .then(success => {
    if (success) {
      console.log(`${GREEN}You can now run the template fix scripts again.${RESET}`);
      process.exit(0);
    } else {
      console.log(`${RED}Database connection issues persist. Please check the logs.${RESET}`);
      process.exit(1);
    }
  })
  .catch(error => {
    console.error(`${RED}Unexpected error:${RESET}`, error);
    process.exit(1);
  });
