/**
 * Factory Index
 * Exports all test data factories as a unified system
 */

const { config, reporting } = require('../scripts/test-utils');
const BaseFactory = require('./base.factory');
const UserFactory = require('./user.factory');
const QuestionnaireFactory = require('./questionnaire.factory');
const AnalysisFactory = require('./analysis.factory');
const ReportFactory = require('./report.factory');
const PaymentFactory = require('./payment.factory');

/**
 * TestData Manager
 * Central management system for test data creation, usage, and cleanup
 */
class TestDataManager {
  constructor() {
    // Initialize core configuration
    this.config = config;
    
    // Initialize factories with config
    this.baseFactory = new BaseFactory(config);
    this.userFactory = new UserFactory(config);
    this.questionnaireFactory = new QuestionnaireFactory(config);
    this.analysisFactory = new AnalysisFactory(config);
    this.reportFactory = new ReportFactory(config);
    this.paymentFactory = new PaymentFactory(config);
    
    // Track if cleanup has been registered
    this.cleanupRegistered = false;
    
    // Store auth token when available
    this.currentToken = null;
  }
  
  /**
   * Set auth token for all factories
   * @param {string} token - JWT auth token
   * @returns {TestDataManager} - this instance for chaining
   */
  withToken(token) {
    this.currentToken = token;
    this.userFactory.withToken(token);
    this.questionnaireFactory.withToken(token);
    this.analysisFactory.withToken(token);
    this.reportFactory.withToken(token);
    this.paymentFactory.withToken(token);
    return this;
  }
  
  /**
   * Register cleanup function to run after tests complete
   */
  registerCleanup() {
    if (this.cleanupRegistered) {
      return;
    }
    
    if (this.config.testData?.cleanup !== false) {
      // Handle cleanup when process exits or tests complete
      const cleanup = async () => {
        reporting.log('Running test data cleanup...', 'info');
        try {
          await this.cleanup();
        } catch (error) {
          reporting.log(`Error during cleanup: ${error.message}`, 'error');
        }
      };
      
      // Register cleanup handlers
      process.on('beforeExit', cleanup);
      process.on('SIGINT', cleanup);
      process.on('SIGTERM', cleanup);
      
      if (typeof afterAll === 'function') {
        afterAll(cleanup);
      }
      
      this.cleanupRegistered = true;
      reporting.log('Test data cleanup registered', 'info');
    } else {
      reporting.log('Test data cleanup disabled in configuration', 'info');
    }
  }
  
  /**
   * Clean up all test data created during tests
   * @returns {Promise<void>}
   */
  async cleanup() {
    if (!this.currentToken) {
      reporting.log('No auth token set, skipping cleanup', 'warn');
      return;
    }
    
    // Clean up in reverse order of creation dependency
    await this.reportFactory.cleanup();
    await this.analysisFactory.cleanup();
    await this.paymentFactory.cleanup();
    await this.questionnaireFactory.cleanup();
    await this.userFactory.cleanup();
  }
  
  /**
   * Create complete end-to-end test data scenario
   * Creates user, template, submission, analysis, and report
   * @param {object} options - Configuration options
   * @returns {Promise<object>} - Created test data
   */
  async createEndToEndScenario(options = {}) {
    // Create a test user first
    const { user, token } = await this.userFactory.create(options.user);
    
    // Set token for all factories
    this.withToken(token);
    
    // Create a test questionnaire and submission
    const submission = await this.questionnaireFactory.createCompleteSubmission(
      options.template,
      options.responses
    );
    
    // Create an analysis
    const analysis = await this.analysisFactory.createAndWaitForAnalysis(
      submission.submissionId,
      options.analysis
    );
    
    // Create a report
    const report = await this.reportFactory.createAndWaitForReport(
      analysis.id,
      options.report
    );
    
    // Return the full test data scenario
    return {
      user,
      token,
      template: submission.template,
      submission: submission.submission,
      analysis,
      report
    };
  }
}

// Export individual factories for direct use
module.exports = {
  BaseFactory,
  UserFactory,
  QuestionnaireFactory,
  AnalysisFactory,
  ReportFactory,
  PaymentFactory,
  
  // Export a pre-configured instance of TestDataManager
  testData: new TestDataManager()
};
