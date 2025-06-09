#!/usr/bin/env node

/**
 * Integration Test Runner
 * This script runs the integration tests for the Risk Assessment Application
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const minimist = require('minimist');
const { environment, reporting } = require('./scripts/test-utils');

// Parse command line arguments
const argv = minimist(process.argv.slice(2));
const suiteName = argv.suite;

// Initialize reporting
reporting.init();

// Available test suites
const suites = {
  'health': ['health-checks.test.js', 'health-monitoring.test.js'],
  'auth': ['auth-service.test.js'],
  'questionnaire': ['questionnaire-service.test.js'],
  'payment': ['payment-service.test.js'],
  'analysis': ['analysis-service.test.js'],
  'report': ['report-service.test.js'],
  'api-gateway': ['api-gateway-middleware.test.js'],
  'service-interaction': [
    'questionnaire-analysis.test.js',
    'service-resilience.test.js',
  ],
  'resilience': [
    'service-resilience.test.js',
    'enhanced-error-scenarios.test.js'
  ],
  'user-journey': [
    'analysis-report.test.js',
    'auth-payment.test.js'
  ],
  'complete': [
    'health-checks.test.js',
    'health-monitoring.test.js',
    'auth-service.test.js',
    'questionnaire-service.test.js',
    'payment-service.test.js',
    'analysis-service.test.js',
    'report-service.test.js',
    'api-gateway-middleware.test.js',
    'questionnaire-analysis.test.js',
    'analysis-report.test.js',
    'auth-payment.test.js',
    'service-resilience.test.js'
  ]
};

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
  console.log(chalk.blue(`Starting integration tests at ${startTime.toISOString()}`));
  console.log(chalk.blue('==============================================='));
  
  try {
    // Check if services are running
    let servicesRunning = await environment.checkServicesHealth();
    
    if (!servicesRunning) {
      console.log(chalk.yellow('Services not running. Starting services...'));
      const servicesStarted = await environment.startServices();
      
      // Continue even if health checks are not passing, as long as services started
      if (!servicesStarted) {
        console.log(chalk.yellow('Warning: Services may not be fully healthy, but will attempt to run tests anyway.'));
        // Don't throw an error, proceed with tests
      }
    }
    
    // Determine which tests to run
    let testFiles = [];
    
    if (suiteName) {
      if (suites[suiteName]) {
        testFiles = suites[suiteName].map(file => path.join(__dirname, 'suites', file));
        console.log(chalk.blue(`Running test suite: ${suiteName}`));
      } else {
        throw new Error(`Unknown test suite: ${suiteName}`);
      }
    } else {
      // Run all tests
      console.log(chalk.blue('Running all test suites'));
      Object.values(suites).forEach(suite => {
        suite.forEach(file => {
          testFiles.push(path.join(__dirname, 'suites', file));
        });
      });
    }
    
    // Run all tests in sequence
    let passed = 0;
    let failed = 0;
    
    for (const testFile of testFiles) {
      if (fs.existsSync(testFile)) {
        const success = await runTest(testFile);
        if (success) {
          passed++;
        } else {
          failed++;
        }
      } else {
        console.log(chalk.yellow(`Test file not found: ${testFile}`));
      }
    }
    
    // Print summary
    const endTime = new Date();
    const duration = (endTime - startTime) / 1000;
    
    console.log(chalk.blue('\n==============================================='));
    console.log(chalk.blue(`Test Summary:`));
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
  } finally {
    // Optional: Stop services after tests
    if (argv.cleanup) {
      environment.stopServices();
    }
  }
}

// Create suites directory if it doesn't exist
const suitesDir = path.join(__dirname, 'suites');
if (!fs.existsSync(suitesDir)) {
  fs.mkdirSync(suitesDir, { recursive: true });
}

// Run the main function
main().catch(error => {
  console.error(chalk.red('Unhandled error:'), error);
  process.exit(1);
});
