/**
 * Mock Environment Setup Script
 * 
 * This script configures the necessary environment variables for running
 * tests without a real database connection.
 */

const fs = require('fs');
const path = require('path');

// Helper function to ensure a directory exists
function ensureDirExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Created directory: ${dirPath}`);
  }
}

// Create a .env.test file for the questionnaire service
function setupQuestionnaireServiceEnv() {
  const envPath = path.join(__dirname, '..', '.env.test');
  
  const envContent = `
# Test Environment Configuration
NODE_ENV=development
PORT=4001
LOG_LEVEL=debug

# Mock Database Configuration
DATABASE_URL=postgresql://mock:mock@localhost:5433/mock_db
BYPASS_DB_VALIDATION=true
TEMPLATE_CHECK_SKIP_DB=true
MOCK_PRISMA_CLIENT=true

# Authentication Bypass
BYPASS_AUTH=true
JWT_SECRET=mock-jwt-secret-for-testing
TOKEN_EXPIRY=24h

# Service URLs
API_GATEWAY_URL=http://localhost:3000
ANALYSIS_SERVICE_URL=http://localhost:4002
REPORT_SERVICE_URL=http://localhost:4003
  `.trim();

  fs.writeFileSync(envPath, envContent);
  console.log(`Created mock environment file: ${envPath}`);
}

// Create a mock directory for the questionnaire service
function createMockDataDir() {
  const mockDir = path.join(__dirname, '..', 'src', 'mocks');
  ensureDirExists(mockDir);
  
  // Create a mock data file
  const mockDataPath = path.join(mockDir, 'mock-data.js');
  const mockDataContent = `
/**
 * Mock Data for Testing
 */

module.exports = {
  templates: [
    {
      id: 'template-001',
      name: 'ISO 27001',
      description: 'Information Security Management System',
      version: '1.0',
      sections: [
        {
          id: 'section-001',
          title: 'Risk Assessment',
          questions: [
            {
              id: 'question-001',
              text: 'Have you performed a risk assessment?',
              type: 'BOOLEAN',
              required: true
            }
          ]
        }
      ]
    }
  ],
  
  submissions: [
    {
      id: 'submission-001',
      templateId: 'template-001',
      userId: 'user-001',
      name: 'Test Submission',
      status: 'COMPLETED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      answers: [
        {
          questionId: 'question-001',
          value: 'true'
        }
      ]
    }
  ],
  
  users: [
    {
      id: 'user-001',
      email: 'test@example.com',
      name: 'Test User',
      role: 'ADMIN'
    }
  ]
};
  `.trim();
  
  fs.writeFileSync(mockDataPath, mockDataContent);
  console.log(`Created mock data file: ${mockDataPath}`);
}

// Setup mock environment for the report service
function setupReportServiceEnv() {
  const envPath = path.join(__dirname, '..', '..', 'report-service', '.env.test');
  
  const envContent = `
# Test Environment Configuration
NODE_ENV=development
PORT=4003
LOG_LEVEL=debug

# Mock Database Configuration
DATABASE_URL=postgresql://mock:mock@localhost:5433/mock_db
BYPASS_DB_VALIDATION=true
MOCK_PRISMA_CLIENT=true

# Authentication Bypass
BYPASS_AUTH=true
JWT_SECRET=mock-jwt-secret-for-testing

# Service URLs
API_GATEWAY_URL=http://localhost:3000
QUESTIONNAIRE_SERVICE_URL=http://localhost:4001
ANALYSIS_SERVICE_URL=http://localhost:4002
  `.trim();

  // Ensure the directory exists
  ensureDirExists(path.dirname(envPath));
  
  fs.writeFileSync(envPath, envContent);
  console.log(`Created mock environment file: ${envPath}`);
}

// Setup mock environment for the analysis service
function setupAnalysisServiceEnv() {
  const envPath = path.join(__dirname, '..', '..', 'analysis-service', '.env.test');
  
  const envContent = `
# Test Environment Configuration
NODE_ENV=development
PORT=4002
LOG_LEVEL=debug

# Mock Database Configuration
DATABASE_URL=postgresql://mock:mock@localhost:5433/mock_db
BYPASS_DB_VALIDATION=true
MOCK_PRISMA_CLIENT=true

# Authentication Bypass
BYPASS_AUTH=true
JWT_SECRET=mock-jwt-secret-for-testing

# Service URLs
API_GATEWAY_URL=http://localhost:3000
QUESTIONNAIRE_SERVICE_URL=http://localhost:4001
REPORT_SERVICE_URL=http://localhost:4003
  `.trim();

  // Ensure the directory exists
  ensureDirExists(path.dirname(envPath));
  
  fs.writeFileSync(envPath, envContent);
  console.log(`Created mock environment file: ${envPath}`);
}

// Main execution
try {
  console.log('Setting up mock environment...');
  
  // Setup environment files
  setupQuestionnaireServiceEnv();
  setupReportServiceEnv();
  setupAnalysisServiceEnv();
  
  // Create mock data
  createMockDataDir();
  
  console.log('Mock environment setup complete!');
} catch (error) {
  console.error('Error setting up mock environment:', error);
  process.exit(1);
}
