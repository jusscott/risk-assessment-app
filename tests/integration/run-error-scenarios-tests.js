/**
 * Error Scenarios Test Runner
 * Executes the error scenarios integration tests
 */

const { reporting } = require('./scripts/test-utils');
const errorScenarioTests = require('./suites/error-scenarios.test');

/**
 * Main function to run the tests
 */
async function runTests() {
  reporting.init();
  reporting.log('Starting Error Scenarios Integration Tests Runner', 'info');
  
  try {
    reporting.log('Executing error scenario test suite', 'info');
    await errorScenarioTests.runTests();
    
    reporting.log('All error scenario tests completed', 'info');
    reporting.saveResults();
    
    process.exit(0);
  } catch (error) {
    reporting.log(`Error scenario tests failed: ${error.message}`, 'error');
    reporting.saveResults();
    
    process.exit(1);
  }
}

// Run the tests
runTests();
