#!/usr/bin/env node

/**
 * Parallel Integration Test Runner
 * This script runs integration tests in parallel for the Risk Assessment Application
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const minimist = require('minimist');
const { environment, reporting } = require('./scripts/test-utils');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const os = require('os');

// Parse command line arguments
const argv = minimist(process.argv.slice(2));
const suiteName = argv.suite;
const maxConcurrency = argv.concurrency || Math.max(1, os.cpus().length - 1); // Default to CPU count - 1

// Special parameter to identify if the script is being run as a worker
const workerTestFile = argv.workerTestFile;

// Initialize reporting
reporting.init();

// Available test suites
const suites = {
  'health': ['health-checks.test.js'],
  'auth': ['auth-service.test.js'],
  'questionnaire': ['questionnaire-service.test.js'],
  'payment': ['payment-service.test.js'],
  'analysis': ['analysis-service.test.js'],
  'report': ['report-service.test.js'],
  'api-gateway': ['api-gateway-middleware.test.js'],
  'service-interaction': [
    'questionnaire-analysis.test.js',
  ],
  'user-journey': [
    'analysis-report.test.js',
    'auth-payment.test.js'
  ],
  'error-scenarios': [
    'error-scenarios.test.js'
  ],
  'custom-rules': [
    'custom-rules.test.js'
  ],
  'complete': [
    'health-checks.test.js',
    'auth-service.test.js',
    'questionnaire-service.test.js',
    'payment-service.test.js',
    'analysis-service.test.js',
    'report-service.test.js',
    'api-gateway-middleware.test.js',
    'questionnaire-analysis.test.js',
    'analysis-report.test.js',
    'auth-payment.test.js',
    'error-scenarios.test.js',
    'custom-rules.test.js'
  ]
};

// Worker function to run a single test file
if (!isMainThread && workerTestFile) {
  // This code will run in a worker thread
  const testPath = workerTestFile;
  const runTest = async () => {
    try {
      const test = require(testPath);
      
      if (typeof test.runTests === 'function') {
        await test.runTests();
        parentPort.postMessage({ success: true, file: path.basename(testPath) });
      } else {
        parentPort.postMessage({ 
          success: false, 
          file: path.basename(testPath), 
          error: 'Test file does not export a runTests function' 
        });
      }
    } catch (error) {
      parentPort.postMessage({ 
        success: false, 
        file: path.basename(testPath), 
        error: error.message,
        stack: error.stack 
      });
    }
  };

  runTest().catch(error => {
    parentPort.postMessage({ 
      success: false, 
      file: path.basename(testPath), 
      error: error.message,
      stack: error.stack 
    });
  });
} else if (isMainThread) {
  // Main thread code
  const runTestInWorker = (testPath) => {
    return new Promise((resolve) => {
      const worker = new Worker(__filename, {
        workerData: { test: path.basename(testPath) },
        argv: ['--workerTestFile', testPath]
      });

      worker.on('message', (message) => {
        if (message.success) {
          console.log(chalk.green(`✓ Test completed: ${message.file}`));
          resolve(true);
        } else {
          console.error(chalk.red(`✗ Test failed: ${message.file}`), message.error);
          if (message.stack) {
            console.error(chalk.gray(message.stack));
          }
          resolve(false);
        }
      });

      worker.on('error', (error) => {
        console.error(chalk.red(`✗ Worker error: ${path.basename(testPath)}`), error);
        resolve(false);
      });

      worker.on('exit', (code) => {
        if (code !== 0) {
          console.error(chalk.red(`✗ Worker exited with code ${code}: ${path.basename(testPath)}`));
          resolve(false);
        }
      });
    });
  };

  // Main function to run tests in parallel
  async function main() {
    const startTime = new Date();
    console.log(chalk.blue(`Starting parallel integration tests at ${startTime.toISOString()}`));
    console.log(chalk.blue('==============================================='));
    console.log(chalk.blue(`Running with maximum concurrency: ${maxConcurrency}`));
    
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
        // Use the 'complete' suite which includes all test files
        testFiles = suites['complete'].map(file => path.join(__dirname, 'suites', file));
      }
      
      // Filter out non-existent files
      testFiles = testFiles.filter(file => {
        if (fs.existsSync(file)) {
          return true;
        }
        console.log(chalk.yellow(`Test file not found: ${file}`));
        return false;
      });
      
      if (testFiles.length === 0) {
        console.log(chalk.yellow('No test files found to run'));
        process.exit(0);
      }
      
      // Execute tests in parallel with limited concurrency
      const results = [];
      let passed = 0;
      let failed = 0;
      
      // Group test files by test type for better resource utilization
      const testGroups = {
        health: testFiles.filter(file => file.includes('health-checks')),
        service: testFiles.filter(file => 
          file.includes('auth-service') || 
          file.includes('questionnaire-service') || 
          file.includes('payment-service') || 
          file.includes('analysis-service') || 
          file.includes('report-service') ||
          file.includes('api-gateway-middleware')
        ),
        interaction: testFiles.filter(file => 
          file.includes('questionnaire-analysis') ||
          file.includes('analysis-report') ||
          file.includes('auth-payment')
        ),
        error: testFiles.filter(file => file.includes('error-scenarios')),
      };
      
      // Run health checks first
      if (testGroups.health.length > 0) {
        console.log(chalk.blue('\n=== Running Health Check Tests ==='));
        const healthResults = await Promise.all(testGroups.health.map(runTestInWorker));
        results.push(...healthResults);
      }
      
      // Run service tests with parallelization
      if (testGroups.service.length > 0) {
        console.log(chalk.blue('\n=== Running Service Tests ==='));
        
        // Process in chunks for controlled parallelization
        for (let i = 0; i < testGroups.service.length; i += maxConcurrency) {
          const chunk = testGroups.service.slice(i, i + maxConcurrency);
          const chunkResults = await Promise.all(chunk.map(runTestInWorker));
          results.push(...chunkResults);
        }
      }
      
      // Run interaction tests with limited parallelization
      if (testGroups.interaction.length > 0) {
        console.log(chalk.blue('\n=== Running Service Interaction Tests ==='));
        
        // Use more controlled parallelization for interaction tests
        const interactionConcurrency = Math.min(2, maxConcurrency);
        for (let i = 0; i < testGroups.interaction.length; i += interactionConcurrency) {
          const chunk = testGroups.interaction.slice(i, i + interactionConcurrency);
          const chunkResults = await Promise.all(chunk.map(runTestInWorker));
          results.push(...chunkResults);
        }
      }
      
      // Run error scenario tests last (they often interfere with other tests)
      if (testGroups.error.length > 0) {
        console.log(chalk.blue('\n=== Running Error Scenario Tests ==='));
        const errorResults = await Promise.all(testGroups.error.map(runTestInWorker));
        results.push(...errorResults);
      }
      
      // Count results
      passed = results.filter(success => success).length;
      failed = results.filter(success => !success).length;
      
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
}
