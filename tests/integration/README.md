# Risk Assessment App Integration Testing Framework

This directory contains a comprehensive integration testing framework for the Risk Assessment Application. The framework focuses on testing service interactions, API endpoints, and end-to-end flows across the microservices architecture.

## Directory Structure

```
tests/integration/
├── config/               # Test configuration files
│   └── test-config.js    # Main configuration for test environment
├── fixtures/             # Test data fixtures
├── reports/              # Generated test reports
├── scripts/              # Test utility scripts
│   └── test-utils.js     # Common utility functions
├── suites/               # Test suites
│   ├── health-checks.test.js          # Basic service health checks
│   ├── auth-service.test.js           # Auth service tests
│   ├── questionnaire-service.test.js  # Questionnaire service tests
│   ├── payment-service.test.js        # Payment service tests
│   ├── analysis-service.test.js       # Analysis service tests
│   ├── report-service.test.js         # Report service tests
│   ├── api-gateway.test.js            # API Gateway tests
│   ├── auth-questionnaire.test.js     # Auth-Questionnaire interaction tests
│   ├── questionnaire-analysis.test.js # Questionnaire-Analysis interaction tests
│   ├── analysis-report.test.js        # Analysis-Report interaction tests
│   └── auth-payment.test.js           # Auth-Payment interaction tests
├── package.json          # Test dependencies
├── runner.js             # Test runner script
└── README.md             # This documentation file
```

## Key Features

- **Modular Test Structure**: Tests are organized by service and interaction flows
- **Comprehensive Coverage**: Tests health checks, APIs, error handling, and cross-service interactions
- **Automated Environment Setup**: Automatically starts services when needed
- **Detailed Reporting**: Generates JSON reports of test results
- **Configurable**: Easily configure test timeouts, retry logic, and test data

## Getting Started

### Prerequisites

- Node.js 16+
- Docker and Docker Compose
- The Risk Assessment App repository

### Installation

From the root of the repository, run:

```bash
# Install dependencies
cd tests/integration
npm install
```

Or use the helper script:

```bash
./run-integration-tests.sh --install
```

### Running Tests

You can run tests in several ways:

#### Using the Helper Script (Recommended)

```bash
# Run all tests
./run-integration-tests.sh

# Run a specific test suite
./run-integration-tests.sh --suite=health

# Run specific tests and stop services after completion
./run-integration-tests.sh --suite=questionnaire-analysis --stop-services

# Run the complete user journey tests
./run-integration-tests.sh --suite=user-journey

# Show help
./run-integration-tests.sh --help
```

#### Using Node Directly

```bash
cd tests/integration
node runner.js

# Run a specific suite
node runner.js --suite=health

# Run user journey tests
node runner.js --suite=user-journey

# Run complete test suite
node runner.js --suite=complete

# Run with cleanup after tests
node runner.js --cleanup
```

#### Using npm Scripts

```bash
cd tests/integration
npm test

# Run a specific suite
npm run test:health
npm run test:questionnaire
npm run test:service-interaction
npm run test:user-journey
```

### Available Test Suites

The integration tests are organized into several suites that can be run independently:

1. **health** - Basic health checks for all services
2. **auth** - Auth service API tests
3. **questionnaire** - Questionnaire service API tests
4. **payment** - Payment service API tests
5. **analysis** - Analysis service API tests
6. **report** - Report service API tests
7. **api-gateway** - API Gateway and middleware tests
8. **service-interaction** - Tests for interactions between closely related services
9. **user-journey** - End-to-end tests focusing on complete user journeys across multiple services
10. **complete** - Runs all test suites

## Test Configuration

The main configuration file is located at `config/test-config.js`. It includes:

- Service URLs
- Test user credentials
- Test data for various scenarios
- Timeouts and retry settings
- Reporting configuration

You can modify this file to adjust the test environment according to your needs.

## Writing New Tests

### Test Structure

Each test file should:

1. Import required utilities:
   ```javascript
   const { config, request, auth, assert, reporting } = require('../scripts/test-utils');
   ```

2. Export a `runTests` function that will be called by the test runner:
   ```javascript
   async function runTests() {
     // Test implementation
     return true; // Return true if tests pass
   }

   module.exports = {
     runTests
   };
   ```

3. Use the reporting utility to log test progress:
   ```javascript
   reporting.log('Starting test', 'info');
   reporting.recordTest('Test Name', passed, 'Test message', details);
   ```

4. Use the assertion utility to verify test results:
   ```javascript
   assert.success(response, 'API should return success');
   assert.equal(value1, value2, 'Values should be equal');
   assert.hasFields(response, ['id', 'name'], 'Response missing required fields');
   ```

### Example Test

```javascript
async function runTests() {
  reporting.log('Starting example test', 'info');
  
  try {
    // Get auth token
    const token = await auth.registerAndLogin(config.testUsers.regularUser);
    
    // Make API request
    const response = await request.get(
      `${config.services.apiGateway}/api/resource`,
      request.authHeader(token)
    );
    
    // Verify response
    assert.success(response, 'Should get resource successfully');
    assert.hasFields(response.data.data, ['id', 'name'], 'Response should have id and name');
    
    // Record test result
    reporting.recordTest('Get Resource Test', true, 'Successfully retrieved resource');
    
    return true;
  } catch (error) {
    reporting.log(`Test failed: ${error.message}`, 'error');
    throw error;
  }
}
```

## Integration Test Types

### 1. Health Checks

Basic tests that verify all services are accessible and reporting healthy status.

### 2. Service-Specific Tests

Tests that focus on the API and functionality of a single service.

### 3. Service Interaction Tests

Tests that verify the correct interaction between two or more services, including:
- Data passing between services
- Error handling
- Transaction integrity
- Event propagation

### 4. Data Consistency Tests

Tests that ensure data remains consistent across services during operations.

### 5. Authentication and Authorization Tests

Tests that verify security mechanisms are working correctly across services.

## Best Practices

1. **Test Independence**: Each test should be independent and not rely on the state from previous tests.

2. **Clean Up After Tests**: Clean up any test data created during tests to avoid affecting subsequent test runs.

3. **Test Real Scenarios**: Focus on testing real user flows and scenarios, not just API endpoints.

4. **Test Error Handling**: Verify how the system handles errors and edge cases, not just the happy path.

5. **Keep Tests Fast**: Integration tests can be slow, so keep them as efficient as possible.

6. **Use Descriptive Test Names**: Make it clear what each test is verifying.

7. **Log Relevant Information**: Use the reporting utility to log important information to help debugging.

## Troubleshooting

### Common Issues

1. **Services Not Starting**
   - Check Docker is running
   - Verify port conflicts
   - Check docker-compose.yml configuration

2. **Authentication Failures**
   - Verify test user credentials
   - Check token expiration
   - Verify auth service is running

3. **Test Timeouts**
   - Increase timeouts in test-config.js
   - Check for performance issues in services

### Debugging Tips

- Run a single test suite for faster debugging
- Use `reporting.log()` to add more logging
- Check test reports in the reports directory
- Examine Docker logs for service errors

## Contributing

When adding new test suites:

1. Create a new file in the `suites` directory
2. Update the `suites` object in `runner.js` 
3. Add an npm script to `package.json` if desired
4. Document the new tests in this README

## License

Same as the main Risk Assessment Application.
