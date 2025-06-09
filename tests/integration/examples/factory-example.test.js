/**
 * Factory Example Test
 * Demonstrates how to use the test data factories for integration testing
 * 
 * This example shows how to:
 * 1. Create test users, questionnaires, analyses, and reports
 * 2. Set up automatic cleanup
 * 3. Use factories for test data management
 */

const { factories, assert, reporting } = require('../scripts/test-utils');

// Specify which factory classes we're using
const { UserFactory, QuestionnaireFactory, AnalysisFactory, ReportFactory } = factories;

// Or use the pre-configured testData manager instance that combines all factories
const { testData } = factories;

// Set timeout higher for integration tests
jest.setTimeout(30000);

describe('Test Data Factory Example', () => {
  // Initialize factories for this test suite
  const userFactory = new UserFactory();
  const questionnaireFactory = new QuestionnaireFactory();
  const analysisFactory = new AnalysisFactory();
  const reportFactory = new ReportFactory();
  
  // Track test artifacts for cleanup
  let testUser;
  let token;
  
  // Set up and ensure cleanup
  beforeAll(async () => {
    reporting.log('Setting up test data for Test Data Factory Example', 'info');
    
    // Register cleanup to happen after all tests
    testData.registerCleanup();
  });
  
  beforeEach(async () => {
    // Create a test user for each test case
    const result = await userFactory.create({
      email: `factory-example-${Date.now()}@example.com`,
      password: 'Test12345!',
      firstName: 'Factory',
      lastName: 'Example',
      organizationName: 'Test Organization'
    });
    
    testUser = result.user;
    token = result.token;
    
    // Set the token on all factories
    questionnaireFactory.withToken(token);
    analysisFactory.withToken(token);
    reportFactory.withToken(token);
  });
  
  test('Example: Creating a questionnaire template', async () => {
    // Create a template
    const template = await questionnaireFactory.createTemplate({
      title: 'Example Template',
      description: 'Template created by factory example test'
    });
    
    // Verify the template was created
    expect(template).toBeDefined();
    expect(template.id).toBeDefined();
    expect(template.title).toBe('Example Template');
    
    // The template will be automatically cleaned up after tests
    reporting.recordTest(
      'Create Template',
      true,
      'Successfully created questionnaire template',
      { templateId: template.id }
    );
  });
  
  test('Example: Complete questionnaire submission flow', async () => {
    // Create a template
    const template = await questionnaireFactory.createTemplate();
    
    // Create a submission
    const submission = await questionnaireFactory.createSubmission(template.id);
    
    // Add responses
    await questionnaireFactory.addResponses(submission.id);
    
    // Finalize submission
    const finalized = await questionnaireFactory.finalizeSubmission(submission.id);
    
    // Verify the submission was finalized
    expect(finalized).toBeDefined();
    expect(finalized.data.id).toBe(submission.id);
    
    reporting.recordTest(
      'Questionnaire Flow',
      true,
      'Successfully completed questionnaire submission flow',
      { submissionId: submission.id }
    );
  });
  
  test('Example: End-to-end scenario with testData manager', async () => {
    // Using the testData manager to create a complete scenario with one call
    // This creates user, template, submission, analysis, and report
    const scenario = await testData
      .withToken(token)
      .createEndToEndScenario({
        template: {
          title: 'E2E Test Template',
          description: 'Created by factory example test'
        },
        responses: [
          { questionId: "q1", value: true },
          { questionId: "q2", value: "quarterly" },
          { questionId: "q3", value: true },
          { questionId: "q4", value: "monthly" }
        ]
      });
    
    // Verify we have all the pieces
    expect(scenario.template).toBeDefined();
    expect(scenario.submission).toBeDefined();
    expect(scenario.analysis).toBeDefined();
    expect(scenario.report).toBeDefined();
    
    reporting.recordTest(
      'End-to-End Scenario',
      true,
      'Successfully created end-to-end test scenario',
      {
        templateId: scenario.template.id,
        submissionId: scenario.submission.id,
        analysisId: scenario.analysis.id,
        reportId: scenario.report.id
      }
    );
  });
  
  test('Example: Using multiple user scenarios', async () => {
    // Create multiple test users
    const users = await userFactory.createMany(3);
    
    // Verify users were created
    expect(users.length).toBe(3);
    expect(users[0].token).toBeDefined();
    expect(users[1].token).toBeDefined();
    expect(users[2].token).toBeDefined();
    
    // Create data for the first user
    questionnaireFactory.withToken(users[0].token);
    const template = await questionnaireFactory.createTemplate();
    
    // Create data for the second user
    questionnaireFactory.withToken(users[1].token);
    const submission = await questionnaireFactory.createSubmission(template.id);
    
    // Create data for the third user
    analysisFactory.withToken(users[2].token);
    try {
      // This should fail because the third user doesn't own the submission
      await analysisFactory.createAnalysis(submission.id);
      reporting.recordTest(
        'Cross-User Access',
        false,
        'User should not be able to create analysis for submission they do not own'
      );
    } catch (error) {
      // This is expected
      reporting.recordTest(
        'Cross-User Access',
        true,
        'Correctly prevented cross-user access to resources'
      );
    }
  });
  
  test('Example: Using payment factory', async () => {
    // Create and use the payment factory
    const paymentFactory = new factories.PaymentFactory();
    paymentFactory.withToken(token);
    
    // Create a payment plan
    const plan = await paymentFactory.createPlan({
      name: 'Premium Test Plan',
      price: 199.99,
      features: ['All features', 'Premium support', 'Unlimited users']
    });
    
    // Create a subscription
    const subscription = await paymentFactory.createSubscription(plan.id);
    
    // Get invoices
    const invoices = await paymentFactory.getInvoices(subscription.id);
    
    // Verify data
    expect(plan).toBeDefined();
    expect(plan.id).toBeDefined();
    expect(subscription).toBeDefined();
    expect(subscription.id).toBeDefined();
    expect(invoices).toBeDefined();
    
    // Test a payment scenario (success, failed, dispute)
    const paymentScenario = await paymentFactory.createPaymentScenario('success');
    
    expect(paymentScenario.plan).toBeDefined();
    expect(paymentScenario.subscription).toBeDefined();
    
    reporting.recordTest(
      'Payment Operations',
      true,
      'Successfully tested payment operations with factory',
      {
        planId: plan.id,
        subscriptionId: subscription.id,
        scenarioType: paymentScenario.scenarioType
      }
    );
  });
  
  afterAll(async () => {
    // Manual cleanup is not needed because we registered automatic cleanup
    // But you can still do it explicitly if needed
    reporting.log('Tests complete, cleanup will happen automatically', 'info');
    
    // Save test results
    reporting.saveResults();
  });
});
