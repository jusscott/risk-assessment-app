#!/usr/bin/env node

/**
 * Circuit Breaker Implementation Manager
 * 
 * This script coordinates the implementation of the circuit breaker pattern
 * across all microservices in the risk assessment application.
 * 
 * Usage:
 *   node implement-circuit-breaker.js [--all] [--service service-name]
 * 
 * Options:
 *   --all             Apply circuit breaker to all services
 *   --service name    Apply circuit breaker to a specific service
 *                     (api-gateway, auth, questionnaire, analysis, report, payment)
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const readline = require('readline');

// Script mappings
const SCRIPTS = {
  'api-gateway': {
    name: 'API Gateway',
    script: 'api-gateway-connectivity-fix.js',
    dependencies: ['enhanced-client.js']
  },
  'auth': {
    name: 'Auth Service',
    script: 'auth-service-connectivity-fix.js',
    dependencies: ['enhanced-client.js']
  },
  'questionnaire': {
    name: 'Questionnaire Service',
    script: 'questionnaire-service-connectivity-fix.js',
    dependencies: ['enhanced-client.js']
  },
  'analysis': {
    name: 'Analysis Service',
    script: 'analysis-service-connectivity-fix.js',
    dependencies: ['enhanced-client.js']
  },
  'report': {
    name: 'Report Service',
    script: 'report-service-connectivity-fix.js',
    dependencies: ['enhanced-client.js']
  },
  'payment': {
    name: 'Payment Service',
    script: 'payment-service-connectivity-fix.js',
    dependencies: ['enhanced-client.js']
  }
};

// Directory where the scripts are located
const SCRIPTS_DIR = __dirname;

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Main function to execute the implementation
 */
async function main() {
  console.log('\n===== Circuit Breaker Implementation Manager =====\n');
  
  // Parse command line arguments
  const args = process.argv.slice(2);
  const allServices = args.includes('--all');
  const serviceFlag = args.indexOf('--service');
  const specificService = serviceFlag !== -1 ? args[serviceFlag + 1] : null;
  
  if (allServices) {
    await implementAllServices();
  } else if (specificService) {
    await implementService(specificService);
  } else {
    await showMenu();
  }
  
  rl.close();
}

/**
 * Display interactive menu for service selection
 */
async function showMenu() {
  console.log('Select which service(s) to implement the circuit breaker pattern for:\n');
  console.log('0. All Services');
  
  // List all available services
  Object.entries(SCRIPTS).forEach(([key, value], index) => {
    console.log(`${index + 1}. ${value.name}`);
  });
  
  console.log('\n9. Exit');
  
  const answer = await askQuestion('\nEnter your choice: ');
  
  if (answer === '0') {
    await implementAllServices();
  } else if (answer === '9') {
    console.log('Exiting implementation manager.');
    return;
  } else {
    const index = parseInt(answer) - 1;
    const services = Object.keys(SCRIPTS);
    
    if (index >= 0 && index < services.length) {
      await implementService(services[index]);
    } else {
      console.log('Invalid choice. Please try again.');
      await showMenu();
    }
  }
}

/**
 * Implement circuit breaker for all services
 */
async function implementAllServices() {
  console.log('\n===== Implementing Circuit Breaker for All Services =====\n');
  
  // Check enhanced client script exists
  const enhancedClientExists = fs.existsSync(path.join(SCRIPTS_DIR, 'enhanced-client.js'));
  if (!enhancedClientExists) {
    console.error('Error: Enhanced client script is missing. Cannot proceed with implementation.');
    process.exit(1);
  }
  
  // Check all implementation scripts exist
  let allScriptsExist = true;
  
  for (const [key, service] of Object.entries(SCRIPTS)) {
    const scriptPath = path.join(SCRIPTS_DIR, service.script);
    const scriptExists = fs.existsSync(scriptPath);
    
    if (!scriptExists) {
      console.error(`Error: Implementation script for ${service.name} is missing: ${service.script}`);
      allScriptsExist = false;
    }
  }
  
  if (!allScriptsExist) {
    console.error('Some implementation scripts are missing. Cannot proceed with all services implementation.');
    const proceed = await askQuestion('Do you want to proceed with available scripts? (y/n): ');
    
    if (proceed.toLowerCase() !== 'y') {
      console.log('Exiting implementation manager.');
      return;
    }
  }
  
  // Implement each service
  for (const [key, service] of Object.entries(SCRIPTS)) {
    const scriptPath = path.join(SCRIPTS_DIR, service.script);
    
    if (fs.existsSync(scriptPath)) {
      await implementServiceWithScript(key, service, scriptPath);
    }
  }
  
  console.log('\n===== Circuit Breaker Implementation Complete =====\n');
  console.log('Summary of implemented services:');
  
  for (const [key, service] of Object.entries(SCRIPTS)) {
    const scriptPath = path.join(SCRIPTS_DIR, service.script);
    const status = fs.existsSync(scriptPath) ? 'Implemented' : 'Not implemented (script missing)';
    console.log(`- ${service.name}: ${status}`);
  }
  
  console.log('\nNext steps:');
  console.log('1. Review any console output for warnings or errors');
  console.log('2. Run npm install in each service directory if prompted');
  console.log('3. Restart each service to apply changes');
  console.log('4. Test the /health and /circuit-status endpoints for each service');
  console.log('5. Verify circuit breaker functionality with service failure tests');
}

/**
 * Implement circuit breaker for a specific service
 * @param {string} serviceKey - Key of the service to implement
 */
async function implementService(serviceKey) {
  const service = SCRIPTS[serviceKey];
  
  if (!service) {
    console.error(`Error: Unknown service "${serviceKey}". Available services are: ${Object.keys(SCRIPTS).join(', ')}`);
    return;
  }
  
  console.log(`\n===== Implementing Circuit Breaker for ${service.name} =====\n`);
  
  // Check enhanced client script exists
  const enhancedClientExists = fs.existsSync(path.join(SCRIPTS_DIR, 'enhanced-client.js'));
  if (!enhancedClientExists) {
    console.error('Error: Enhanced client script is missing. Cannot proceed with implementation.');
    process.exit(1);
  }
  
  // Check implementation script exists
  const scriptPath = path.join(SCRIPTS_DIR, service.script);
  const scriptExists = fs.existsSync(scriptPath);
  
  if (!scriptExists) {
    console.error(`Error: Implementation script for ${service.name} is missing: ${service.script}`);
    return;
  }
  
  await implementServiceWithScript(serviceKey, service, scriptPath);
  
  console.log(`\n===== Circuit Breaker Implementation for ${service.name} Complete =====\n`);
  console.log('Next steps:');
  console.log('1. Review any console output for warnings or errors');
  console.log('2. Run npm install in the service directory if prompted');
  console.log('3. Restart the service to apply changes');
  console.log('4. Test the /health and /circuit-status endpoints');
  console.log('5. Verify circuit breaker functionality with service failure tests');
}

/**
 * Execute an implementation script for a service
 * @param {string} serviceKey - Key of the service
 * @param {Object} service - Service configuration
 * @param {string} scriptPath - Path to the implementation script
 */
async function implementServiceWithScript(serviceKey, service, scriptPath) {
  console.log(`\n>> Implementing circuit breaker for ${service.name}...\n`);
  
  return new Promise((resolve, reject) => {
    const child = spawn('node', [scriptPath], {
      stdio: 'inherit'
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        console.log(`\n>> ${service.name} circuit breaker implementation completed successfully.\n`);
        resolve();
      } else {
        console.error(`\n>> ${service.name} circuit breaker implementation failed with code ${code}\n`);
        resolve(); // Resolve anyway to continue with other services
      }
    });
    
    child.on('error', (error) => {
      console.error(`\n>> Error executing script for ${service.name}: ${error.message}\n`);
      resolve(); // Resolve anyway to continue with other services
    });
  });
}

/**
 * Ask a question and get user input
 * @param {string} question - Question to ask
 * @returns {Promise<string>} User input
 */
function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Run the main function
main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
}).finally(() => {
  // Ensure readline interface is closed
  rl.close();
});
