/**
 * Script to fix the database connection for the questionnaire service
 * The issue was that the service was looking for the database on localhost:5432
 * while the actual database is on port 5433 as configured in .env
 */

const fs = require('fs');
const path = require('path');

// Path to configuration file
const configPath = path.join(__dirname, 'backend', 'questionnaire-service', 'src', 'config', 'config.js');

// Read current config
console.log(`Reading configuration from: ${configPath}`);
let configContent = fs.readFileSync(configPath, 'utf8');

// Check if the config is looking for port 5432 instead of 5433
if (configContent.includes('localhost:5432')) {
  console.log('Found database config using port 5432 instead of 5433');
  
  // Update the config to use port 5433
  configContent = configContent.replace(/localhost:5432/g, 'localhost:5433');
  
  // Write updated config
  fs.writeFileSync(configPath, configContent);
  console.log('Updated config to use port 5433');
} else {
  console.log('Database port in config is not set to 5432, no change needed');
}

// Now check the .env file to make sure mock client is disabled
const envPath = path.join(__dirname, 'backend', 'questionnaire-service', '.env');
let envContent = fs.readFileSync(envPath, 'utf8');

// Disable mock client if it's enabled
if (envContent.includes('MOCK_PRISMA_CLIENT="true"')) {
  console.log('Found MOCK_PRISMA_CLIENT="true" in .env, disabling...');
  
  // Update the env to disable mock client
  envContent = envContent.replace('MOCK_PRISMA_CLIENT="true"', 'MOCK_PRISMA_CLIENT="false"');
  
  // Write updated env
  fs.writeFileSync(envPath, envContent);
  console.log('Disabled mock Prisma client in .env');
} else {
  console.log('Mock Prisma client is not enabled in .env');
}

console.log('Database connection fix completed!');
