# Test Data Factories

This directory contains a comprehensive system for test data management in integration tests. The factory pattern provides a structured approach to creating, using, and cleaning up test data.

## Overview

The factory system follows these key principles:

1. **Consistent test data creation** - Factories generate consistent test data with sensible defaults
2. **Automatic cleanup** - Test data is automatically cleaned up after tests complete
3. **Resilient tests** - Error handling ensures tests can run even when services are unavailable
4. **Type-specific factories** - Specialized factories for each entity type (users, questionnaires, etc.)
5. **Chainable API** - Fluent API for building complex test scenarios

## Available Factories

| Factory                | Purpose                                              |
|------------------------|------------------------------------------------------|
| `BaseFactory`          | Base class with common functionality for all factories |
| `UserFactory`          | Creates and manages test users and authentication     |
| `QuestionnaireFactory` | Creates templates and submissions                     |
| `AnalysisFactory`      | Creates and manages analysis entities                 |
| `ReportFactory`        | Creates and manages report entities                   |
| `PaymentFactory`       | Creates plans, subscriptions and payment scenarios    |

## Factory System Architecture

The factory system is organized hierarchically:

```
BaseFactory
    ├── UserFactory
    ├── QuestionnaireFactory
    ├── AnalysisFactory 
    ├── ReportFactory
    └── PaymentFactory
```

The `TestDataManager` class ties all factories together into a unified system for end-to-end testing.

## Usage Examples

### Basic Usage

```javascript
const { factories } = require('../scripts/test-utils');
const { UserFactory, QuestionnaireFactory } = factories;

// Create factories
const userFactory = new UserFactory();
const questionnaireFactory = new QuestionnaireFactory();

// Create a test user
const { user, token } = await userFactory.create({
  email: 'test@example.com',
  password: 'password123',
  firstName: 'Test',
  lastName: 'User'
});

// Set the auth token on the questionnaire factory
questionnaireFactory.withToken(token);

// Create a questionnaire template
const template = await questionnaireFactory.createTemplate({
  title: 'Test Template',
  description: 'Template for testing'
});

// Create a submission
const submission = await questionnaireFactory.createSubmission(template.id);

// Clean up when done
await questionnaireFactory.cleanup();
await userFactory.cleanup();
```

### Using the TestDataManager

The `testData` instance provides a unified interface to all factories:

```javascript
const { factories } = require('../scripts/test-utils');
const { testData } = factories;

// Register cleanup to run automatically
testData.registerCleanup();

// Create a test user
const { user, token } = await testData.userFactory.create();

// Set the token for all factories
testData.withToken(token);

// Create a complete end-to-end scenario
const scenario = await testData.createEndToEndScenario({
  template: {
    title: 'Test Template'
  },
  responses: [
    { questionId: "q1", value: true },
    { questionId: "q2", value: "quarterly" }
  ]
});

// Access created entities
console.log(scenario.user);
console.log(scenario.template);
console.log(scenario.submission);
console.log(scenario.analysis);
console.log(scenario.report);
```

See the `factory-example.test.js` file in the `examples` directory for more detailed usage examples.

## Best Practices

1. **Always register for cleanup**: Use `testData.registerCleanup()` in your test setup to ensure automatic cleanup.

2. **Use tokens consistently**: Always set the auth token on factories with `factory.withToken(token)` or `testData.withToken(token)`.

3. **Prefer factories over direct API calls**: Use factories instead of making direct API calls to ensure consistent data creation and cleanup.

4. **Use proper overrides**: Factory methods accept override objects to customize created entities while keeping sensible defaults.

5. **Test resilience**: Factory methods include robust error handling to work even when services are unavailable or rate-limited.

## Adding New Factories

To add a new factory for a different entity type:

1. Create a new file named `[entity-type].factory.js`
2. Extend the `BaseFactory` class
3. Implement entity-specific creation methods
4. Register cleanup URLs in the `getCleanupUrl` method in `BaseFactory`
5. Update the `index.js` file to export your new factory

Example:

```javascript
const BaseFactory = require('./base.factory');

class NewEntityFactory extends BaseFactory {
  async createEntity(overrides = {}) {
    const entityData = {
      name: overrides.name || 'Default Name',
      // Add default properties
      ...overrides
    };
    
    const result = await this.createEntityWithCleanup(
      `${this.apiGateway}/api/entities`,
      entityData,
      'entity-type'
    );
    
    return result.data;
  }
}

module.exports = NewEntityFactory;
```

## Troubleshooting

**Q: Why are my tests failing with 401 Unauthorized?**  
A: Make sure you're setting the token on your factories with `factory.withToken(token)`.

**Q: Why isn't cleanup working?**  
A: Ensure you've registered cleanup with `testData.registerCleanup()` and that the auth token is valid.

**Q: How do I debug factory operations?**  
A: The factories use the `reporting` module for logging. Check the logs for information about factory operations.
