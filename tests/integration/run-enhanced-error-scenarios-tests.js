#!/usr/bin/env node

/**
 * Enhanced Error Scenarios Test Runner
 * This script runs integration tests focused on various error handling scenarios
 */

const path = require('path');
const chalk = require('chalk');
const { environment, reporting } = require('./scripts/test-utils');

// Initialize reporting
reporting.init();

// Test files to run
const testFiles = [
  'enhanced-error-scenarios.test.js'
];

// Helper function to load and run tests
async function runTest(testPath) {
  try {
    console.log(chalk.blue(`\n=== Running Test: ${path.basename(testPath)} ===`));
    const test = require(testPath);
    
    if (typeof test.runTests === 'function') {
      await test.runTests();
    } else {
      console.log(chalk.red(`Test file ${testPath} does not export a runTests function`));
      throw new Error('Invalid test file structure');
    }
    
    console.log(chalk.green(`✓ Test completed: ${path.basename(testPath)}`));
    return true;
  } catch (error) {
    console.error(chalk.red(`✗ Test failed: ${path.basename(testPath)}`), error);
    return false;
  }
}

// Main function to run tests
async function main() {
  const startTime = new Date();
  console.log(chalk.blue(`Starting enhanced error scenarios tests at ${startTime.toISOString()}`));
  console.log(chalk.blue('==============================================='));
  
  try {
    // Check if services are running
    let servicesRunning = await environment.checkServicesHealth();
    
    if (!servicesRunning) {
      console.log(chalk.yellow('Services not running. Starting services...'));
      const servicesStarted = await environment.startServices();
      
      if (!servicesStarted) {
        console.log(chalk.yellow('Warning: Services may not be fully healthy, but will attempt to run tests anyway.'));
      }
    }
    
    // Run all tests in sequence
    let passed = 0;
    let failed = 0;
    
    for (const testFile of testFiles) {
      const testPath = path.join(__dirname, 'suites', testFile);
      const success = await runTest(testPath);
      if (success) {
        passed++;
      } else {
        failed++;
      }
    }
    
    // Print summary
    const endTime = new Date();
    const duration = (endTime - startTime) / 1000;
    
    console.log(chalk.blue('\n==============================================='));
    console.log(chalk.blue(`Enhanced Error Scenarios Test Summary:`));
    console.log(chalk.green(`✓ Passed: ${passed}`));
    console.log(chalk.red(`✗ Failed: ${failed}`));
    console.log(chalk.blue(`Total: ${passed + failed}`));
    console.log(chalk.blue(`Duration: ${duration} seconds`));
    console.log(chalk.blue(`Finished at: ${endTime.toISOString()}`));
    
    // Save results
    reporting.saveResults();
    
    // Exit with appropriate code
    process.exit(failed === 0 ? 0 : 1);
  } catch (error) {
    console.error(chalk.red('Test run failed:'), error);
    reporting.saveResults();
    process.exit(1);
  }
}

// Run the main function
main().catch(error => {
  console.error(chalk.red('Unhandled error:'), error);
  process.exit(1);
});
