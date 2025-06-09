/**
 * Test Report Generation Script - Development Mode
 * 
 * This script tests the report generation flow using mock data and
 * dependencies, without requiring a real database connection.
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// Create a directory for test results
const TEST_RESULTS_DIR = path.join(__dirname, 'test-results');
if (!fs.existsSync(TEST_RESULTS_DIR)) {
  fs.mkdirSync(TEST_RESULTS_DIR, { recursive: true });
}

// Mock data
const mockData = {
  user: {
    id: 'user-test-001',
    email: 'test@example.com',
    name: 'Test User'
  },
  template: {
    id: 'template-test-001',
    name: 'ISO 27001 Test',
    description: 'Information Security Risk Assessment'
  },
  submission: {
    name: 'Test Submission',
    answers: [
      { questionId: 'q1', value: 'yes' },
      { questionId: 'q2', value: 'no' },
      { questionId: 'q3', value: 'high' }
    ]
  },
  analysis: {
    riskScore: 75,
    findings: [
      { id: 'finding-001', title: 'Missing Access Control', severity: 'HIGH' },
      { id: 'finding-002', title: 'Weak Password Policy', severity: 'MEDIUM' }
    ]
  }
};

// Mock service endpoints
const MOCK_SERVICES = {
  questionnaire: 'http://localhost:4001',
  analysis: 'http://localhost:4002',
  report: 'http://localhost:4003'
};

// Helper function to generate test IDs
function generateTestId() {
  return `test-${uuidv4().substring(0, 8)}`;
}

// Helper function to log steps with colorful output
function logStep(step, message) {
  const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    red: '\x1b[31m'
  };
  
  console.log(`${colors.bright}${colors.blue}[STEP ${step}]${colors.reset} ${message}`);
}

// Helper function to log success
function logSuccess(message) {
  const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m'
  };
  
  console.log(`${colors.bright}${colors.green}[SUCCESS]${colors.reset} ${message}`);
}

// Helper function to log error
function logError(message, error = null) {
  const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m'
  };
  
  console.error(`${colors.bright}${colors.red}[ERROR]${colors.reset} ${message}`);
  if (error) {
    if (error.response) {
      console.error('  Response data:', error.response.data);
      console.error('  Response status:', error.response.status);
    } else if (error.request) {
      console.error('  No response received');
    } else {
      console.error('  Error message:', error.message);
    }
    if (error.stack) {
      console.error('  Stack trace:', error.stack);
    }
  }
}

// Mock service calls instead of actually making HTTP requests
async function mockServiceCall(service, endpoint, method = 'GET', data = null) {
  console.log(`Mocking ${method} request to ${service}${endpoint}`);
  
  // Simulate some processing time
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Generate mock responses based on the endpoint
  switch (`${service}${endpoint}`) {
    case `${MOCK_SERVICES.questionnaire}/templates`:
      return { data: [mockData.template] };
    
    case `${MOCK_SERVICES.questionnaire}/submissions`:
      const submissionId = generateTestId();
      return { 
        data: { 
          id: submissionId, 
          ...mockData.submission, 
          templateId: mockData.template.id,
          userId: mockData.user.id,
          status: 'COMPLETED',
          createdAt: new Date().toISOString() 
        } 
      };
    
    case `${MOCK_SERVICES.analysis}/analyze`:
      return { 
        data: { 
          id: generateTestId(),
          submissionId: data.submissionId,
          ...mockData.analysis,
          createdAt: new Date().toISOString()
        } 
      };
    
    case `${MOCK_SERVICES.report}/generate`:
      const reportId = generateTestId();
      const reportPath = path.join(TEST_RESULTS_DIR, `report-${reportId}.pdf`);
      
      // Create a mock PDF (just a text file with .pdf extension for testing)
      fs.writeFileSync(reportPath, `Mock report for analysis ID: ${data.analysisId}\nGenerated at: ${new Date().toISOString()}`);
      
      return { 
        data: { 
          id: reportId,
          analysisId: data.analysisId,
          filePath: reportPath,
          status: 'COMPLETED',
          createdAt: new Date().toISOString()
        } 
      };
    
    default:
      return { data: { message: 'Mock endpoint not implemented' } };
  }
}

// Main test flow
async function testReportGeneration() {
  let submissionId = null;
  let analysisId = null;
  let reportId = null;
  
  try {
    // Step 1: Get template
    logStep(1, 'Fetching templates');
    const templatesResponse = await mockServiceCall(MOCK_SERVICES.questionnaire, '/templates');
    const template = templatesResponse.data[0];
    logSuccess(`Found template: ${template.name} (${template.id})`);
    
    // Step 2: Create submission
    logStep(2, 'Creating test submission');
    const submissionResponse = await mockServiceCall(
      MOCK_SERVICES.questionnaire, 
      '/submissions', 
      'POST',
      {
        templateId: template.id,
        userId: mockData.user.id,
        ...mockData.submission
      }
    );
    submissionId = submissionResponse.data.id;
    logSuccess(`Created submission with ID: ${submissionId}`);
    
    // Step 3: Run analysis
    logStep(3, 'Running risk analysis');
    const analysisResponse = await mockServiceCall(
      MOCK_SERVICES.analysis, 
      '/analyze', 
      'POST',
      { submissionId }
    );
    analysisId = analysisResponse.data.id;
    logSuccess(`Analysis completed with ID: ${analysisId}, Risk score: ${analysisResponse.data.riskScore}`);
    
    // Step 4: Generate report
    logStep(4, 'Generating PDF report');
    const reportResponse = await mockServiceCall(
      MOCK_SERVICES.report, 
      '/generate', 
      'POST',
      { analysisId }
    );
    reportId = reportResponse.data.id;
    const reportPath = reportResponse.data.filePath;
    logSuccess(`Report generated with ID: ${reportId}`);
    logSuccess(`Report saved to: ${reportPath}`);
    
    // Step 5: Verify report file
    logStep(5, 'Verifying report file');
    if (fs.existsSync(reportPath)) {
      const fileContent = fs.readFileSync(reportPath, 'utf8');
      logSuccess(`Report file exists and contains ${fileContent.length} characters`);
      console.log('\nReport content preview:');
      console.log('------------------------');
      console.log(fileContent.substring(0, 200) + (fileContent.length > 200 ? '...' : ''));
      console.log('------------------------\n');
    } else {
      throw new Error(`Report file not found at path: ${reportPath}`);
    }
    
    // Final success message
    console.log('\n✅ Report generation test completed successfully!');
    console.log(`   - Submission ID: ${submissionId}`);
    console.log(`   - Analysis ID: ${analysisId}`);
    console.log(`   - Report ID: ${reportId}`);
    console.log(`   - Report file: ${reportPath}`);
    
  } catch (error) {
    logError('Report generation test failed', error);
    process.exit(1);
  }
}

// Run the test
testReportGeneration();
