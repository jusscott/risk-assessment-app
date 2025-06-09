/**
 * Test Report Generation Script
 * 
 * This script tests the report generation flow by:
 * 1. Creating a test questionnaire submission
 * 2. Running the analysis service on the submission
 * 3. Triggering report generation
 * 4. Verifying the report was created
 * 
 * It can be used to manually test the report generation flow after applying fixes.
 */

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { PrismaClient: QuestionnairePrisma } = require('@prisma/client');
const { PrismaClient: AnalysisPrisma } = require('@prisma/client');
const { PrismaClient: ReportPrisma } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

// Set up database clients
const questionnairePrisma = new QuestionnairePrisma({
  datasources: {
    db: {
      url: process.env.QUESTIONNAIRE_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/questionnaire_db'
    }
  }
});

const analysisPrisma = new AnalysisPrisma({
  datasources: {
    db: {
      url: process.env.ANALYSIS_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/analysis_db'
    }
  }
});

const reportPrisma = new ReportPrisma({
  datasources: {
    db: {
      url: process.env.REPORT_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/report_db'
    }
  }
});

// Service URLs (can be overridden with environment variables)
const API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://localhost:5000';
const QUESTIONNAIRE_SERVICE_URL = process.env.QUESTIONNAIRE_SERVICE_URL || 'http://localhost:5003';
const ANALYSIS_SERVICE_URL = process.env.ANALYSIS_SERVICE_URL || 'http://localhost:5004';
const REPORT_SERVICE_URL = process.env.REPORT_SERVICE_URL || 'http://localhost:5005';

// Configuration
const TEST_USER_ID = process.env.TEST_USER_ID || 'test-user-' + Math.floor(Math.random() * 1000);
const LOG_FILE = path.join(__dirname, 'report-generation-test.log');

// Logger
function log(message, type = 'INFO') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${type}] ${message}`;
  console.log(logMessage);
  fs.appendFileSync(LOG_FILE, logMessage + '\n');
}

// Initialize log file
function initLogFile() {
  fs.writeFileSync(LOG_FILE, `# Report Generation Test - ${new Date().toISOString()}\n\n`);
  log('Starting report generation test...');
  log(`Test user ID: ${TEST_USER_ID}`);
  log(`API Gateway URL: ${API_GATEWAY_URL}`);
  log(`Questionnaire Service URL: ${QUESTIONNAIRE_SERVICE_URL}`);
  log(`Analysis Service URL: ${ANALYSIS_SERVICE_URL}`);
  log(`Report Service URL: ${REPORT_SERVICE_URL}`);
  log('-------------------------------------------');
}

// Step 1: Create or find a questionnaire template
async function findOrCreateTemplate() {
  log('Finding or creating a questionnaire template...');
  
  let template = await questionnairePrisma.template.findFirst();
  
  if (!template) {
    log('No template found, creating a simple test template...', 'WARN');
    
    template = await questionnairePrisma.template.create({
      data: {
        name: 'Test Template',
        description: 'A simple test template for report generation testing',
        framework: 'TEST',
        version: '1.0.0',
        questions: JSON.stringify([
          {
            id: 'q1',
            text: 'Do you have a security policy?',
            type: 'boolean',
            required: true
          },
          {
            id: 'q2',
            text: 'Do you perform regular security audits?',
            type: 'boolean',
            required: true
          },
          {
            id: 'q3',
            text: 'Do you have a disaster recovery plan?',
            type: 'boolean',
            required: true
          }
        ])
      }
    });
    
    log(`Created new template with ID: ${template.id}`);
  } else {
    log(`Found existing template with ID: ${template.id}`);
  }
  
  return template;
}

// Step 2: Create a submission for the template
async function createSubmission(templateId) {
  log(`Creating submission for template ${templateId}...`);
  
  const submission = await questionnairePrisma.submission.create({
    data: {
      userId: TEST_USER_ID,
      templateId: templateId,
      status: 'draft',
      responses: JSON.stringify({
        q1: { value: true, notes: 'We have a comprehensive security policy.' },
        q2: { value: true, notes: 'We perform quarterly security audits.' },
        q3: { value: true, notes: 'We have a detailed disaster recovery plan.' }
      })
    }
  });
  
  log(`Created submission with ID: ${submission.id}`);
  return submission;
}

// Step 3: Mark the submission as completed
async function completeSubmission(submissionId) {
  log(`Marking submission ${submissionId} as completed...`);
  
  const updatedSubmission = await questionnairePrisma.submission.update({
    where: {
      id: submissionId
    },
    data: {
      status: 'submitted',
      updatedAt: new Date()
    }
  });
  
  log(`Submission ${submissionId} marked as completed`);
  return updatedSubmission;
}

// Step 4: Notify the Analysis Service about the completed questionnaire
async function notifyAnalysisService(submissionId) {
  log(`Notifying Analysis Service about completed questionnaire ${submissionId}...`);
  
  try {
    const response = await axios.post(
      `${ANALYSIS_SERVICE_URL}/api/webhooks/questionnaire-completed`,
      {
        submissionId,
        userId: TEST_USER_ID
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    log(`Analysis Service notification response: ${response.status}`);
    log(`Response data: ${JSON.stringify(response.data)}`);
    
    return response.data;
  } catch (error) {
    log(`Error notifying Analysis Service: ${error.message}`, 'ERROR');
    if (error.response) {
      log(`Response error data: ${JSON.stringify(error.response.data)}`, 'ERROR');
    }
    throw error;
  }
}

// Step 5: Wait for and check if analysis was created
async function waitForAnalysis(submissionId, maxWaitTimeMs = 10000) {
  log(`Waiting for analysis to be created for submission ${submissionId}...`);
  
  const startTime = Date.now();
  let analysis = null;
  
  while (Date.now() - startTime < maxWaitTimeMs) {
    analysis = await analysisPrisma.analysis.findFirst({
      where: {
        submissionId: submissionId
      }
    });
    
    if (analysis) {
      log(`Analysis found with ID: ${analysis.id}`);
      break;
    }
    
    log('No analysis found yet, waiting...');
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  if (!analysis) {
    log(`No analysis created after ${maxWaitTimeMs / 1000} seconds`, 'ERROR');
    throw new Error(`No analysis created for submission ${submissionId}`);
  }
  
  return analysis;
}

// Step 6: Wait for and check if report was generated
async function waitForReport(analysisId, maxWaitTimeMs = 10000) {
  log(`Waiting for report to be generated for analysis ${analysisId}...`);
  
  const startTime = Date.now();
  let report = null;
  
  while (Date.now() - startTime < maxWaitTimeMs) {
    report = await reportPrisma.report.findFirst({
      where: {
        analysisId: analysisId
      }
    });
    
    if (report) {
      log(`Report found with ID: ${report.id}`);
      break;
    }
    
    log('No report found yet, waiting...');
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  if (!report) {
    log(`No report generated after ${maxWaitTimeMs / 1000} seconds`, 'ERROR');
    throw new Error(`No report generated for analysis ${analysisId}`);
  }
  
  return report;
}

// Step 7: Manual test - Directly call report generation for an analysis
async function testManualReportGeneration(analysisId) {
  log(`Testing manual report generation for analysis ${analysisId}...`);
  
  try {
    const response = await axios.post(
      `${REPORT_SERVICE_URL}/api/reports/generate`,
      {
        analysisId,
        userId: TEST_USER_ID
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    log(`Manual report generation response: ${response.status}`);
    log(`Response data: ${JSON.stringify(response.data)}`);
    
    return response.data;
  } catch (error) {
    log(`Error calling manual report generation: ${error.message}`, 'ERROR');
    if (error.response) {
      log(`Response error data: ${JSON.stringify(error.response.data)}`, 'ERROR');
    }
    throw error;
  }
}

// Step 8: Diagnose URL formats in service configurations
async function diagnoseServiceUrlFormats() {
  log('Diagnosing service URL formats in configurations...');
  
  // Check Analysis Service config
  try {
    const analysisConfigResponse = await axios.get(`${ANALYSIS_SERVICE_URL}/api/diagnostics/config/services`);
    log(`Analysis Service config: ${JSON.stringify(analysisConfigResponse.data)}`);
  } catch (error) {
    log(`Could not retrieve Analysis Service config: ${error.message}`, 'WARN');
  }
  
  // Check Report Service config
  try {
    const reportConfigResponse = await axios.get(`${REPORT_SERVICE_URL}/api/diagnostics/config/services`);
    log(`Report Service config: ${JSON.stringify(reportConfigResponse.data)}`);
  } catch (error) {
    log(`Could not retrieve Report Service config: ${error.message}`, 'WARN');
  }
}

// Main test function
async function main() {
  try {
    initLogFile();
    
    // Step 1: Find or create a template
    const template = await findOrCreateTemplate();
    
    // Step 2: Create a submission
    const submission = await createSubmission(template.id);
    
    // Step 3: Mark the submission as completed
    await completeSubmission(submission.id);
    
    // Step 4: Notify the Analysis Service
    await notifyAnalysisService(submission.id);
    
    // Step 5: Wait for and check if analysis was created
    const analysis = await waitForAnalysis(submission.id);
    
    // Step 6: Wait for and check if report was generated
    const report = await waitForReport(analysis.id);
    
    // Step 7: Test manual report generation for the same analysis
    // This creates a duplicate report but helps test the API directly
    await testManualReportGeneration(analysis.id);
    
    // Step 8: Diagnose URL formats in service configurations
    await diagnoseServiceUrlFormats();
    
    log('===========================================');
    log('✅ TEST COMPLETED SUCCESSFULLY!');
    log('===========================================');
    log(`Template ID: ${template.id}`);
    log(`Submission ID: ${submission.id}`);
    log(`Analysis ID: ${analysis.id}`);
    log(`Report ID: ${report.id}`);
    log(`Log file: ${LOG_FILE}`);
    log('===========================================');
    
  } catch (error) {
    log(`❌ TEST FAILED: ${error.message}`, 'ERROR');
    log(`Stack trace: ${error.stack}`, 'ERROR');
  } finally {
    // Disconnect from Prisma clients
    await questionnairePrisma.$disconnect();
    await analysisPrisma.$disconnect();
    await reportPrisma.$disconnect();
  }
}

// Run the main function
main();
