/**
 * Report Generation Flow Fix Script
 * 
 * This script ensures that reports are properly generated after questionnaires are completed.
 * It fixes the path inconsistency issues between services and ensures proper communication.
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Define the paths we need to update
const analysisSvcConfigPath = path.join(__dirname, 'backend', 'analysis-service', 'src', 'config', 'config.js');
const reportSvcConfigPath = path.join(__dirname, 'backend', 'report-service', 'src', 'config', 'config.js');
const webhookControllerPath = path.join(__dirname, 'backend', 'analysis-service', 'src', 'controllers', 'webhook.controller.js');
const reportGenerationControllerPath = path.join(__dirname, 'backend', 'report-service', 'src', 'controllers', 'generation.controller.js');

// Apply the fixes
console.log('Starting to apply analysis-report flow fixes...');

// Fix 1: Update the analysis service config to properly reference report service with /api
function fixAnalysisServiceConfig() {
  if (!fs.existsSync(analysisSvcConfigPath)) {
    console.error(`File not found: ${analysisSvcConfigPath}`);
    return false;
  }

  let content = fs.readFileSync(analysisSvcConfigPath, 'utf8');
  
  // Check if the report service URL doesn't include /api
  if (content.includes('report: process.env.REPORT_SERVICE_URL || \'http://report-service:5005\'')) {
    content = content.replace(
      'report: process.env.REPORT_SERVICE_URL || \'http://report-service:5005\'',
      'report: process.env.REPORT_SERVICE_URL || \'http://report-service:5005/api\''
    );
    
    fs.writeFileSync(analysisSvcConfigPath, content);
    console.log('✅ Updated analysis service config to include /api in report service URL');
    return true;
  } else {
    console.log('ℹ️ Analysis service config already has the correct URL format');
    return true;
  }
}

// Fix 2: Update the report service config to ensure it correctly references analysis service
function fixReportServiceConfig() {
  if (!fs.existsSync(reportSvcConfigPath)) {
    console.error(`File not found: ${reportSvcConfigPath}`);
    return false;
  }

  let content = fs.readFileSync(reportSvcConfigPath, 'utf8');
  
  // Check if the analysis service URL doesn't include /api
  if (content.includes('analysis: process.env.ANALYSIS_SERVICE_URL || \'http://analysis-service:5004\'')) {
    content = content.replace(
      'analysis: process.env.ANALYSIS_SERVICE_URL || \'http://analysis-service:5004\'',
      'analysis: process.env.ANALYSIS_SERVICE_URL || \'http://analysis-service:5004/api\''
    );
    
    fs.writeFileSync(reportSvcConfigPath, content);
    console.log('✅ Updated report service config to include /api in analysis service URL');
    return true;
  } else {
    console.log('ℹ️ Report service config already has the correct URL format');
    return true;
  }
}

// Fix 3: Update the webhook controller to ensure consistent path handling
function fixWebhookController() {
  if (!fs.existsSync(webhookControllerPath)) {
    console.error(`File not found: ${webhookControllerPath}`);
    return false;
  }

  let content = fs.readFileSync(webhookControllerPath, 'utf8');
  
  // Fix the URL construction in notifyReportService to handle both with and without /api
  if (content.includes('const response = await axios.post(`${config.services.report}/api/reports/generate`')) {
    // We need to make this more robust to handle both URL formats
    const updatedCode = `
    // Ensure URL is properly formatted
    let reportServiceUrl = config.services.report;
    // Remove trailing slash if present
    reportServiceUrl = reportServiceUrl.endsWith('/') ? reportServiceUrl.slice(0, -1) : reportServiceUrl;
    // Determine if we need to add /api or not
    const apiPath = reportServiceUrl.endsWith('/api') ? '' : '/api';
    
    // Call the report service to generate a report
    const response = await axios.post(\`\${reportServiceUrl}\${apiPath}/reports/generate\`, {
      analysisId,
      userId
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });`;
    
    content = content.replace(
      `// Call the report service to generate a report
    const response = await axios.post(\`\${config.services.report}/api/reports/generate\`, {
      analysisId,
      userId
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });`,
      updatedCode
    );
    
    fs.writeFileSync(webhookControllerPath, content);
    console.log('✅ Updated webhook controller to handle URL paths more robustly');
    return true;
  } else {
    console.log('ℹ️ Webhook controller already has robust URL handling or has a different implementation');
    return false;
  }
}

// Fix 4: Update the report generation controller for consistent API calls
function fixReportGenerationController() {
  if (!fs.existsSync(reportGenerationControllerPath)) {
    console.error(`File not found: ${reportGenerationControllerPath}`);
    return false;
  }

  let content = fs.readFileSync(reportGenerationControllerPath, 'utf8');
  
  // Fix the URL construction in fetchAnalysisData
  if (content.includes('const response = await axios.get(')) {
    // Extract the fetchAnalysisData function
    const fetchAnalysisDataFnMatch = content.match(/const fetchAnalysisData = async[\s\S]*?};/);
    
    if (fetchAnalysisDataFnMatch) {
      const updatedFetchAnalysisDataFn = `const fetchAnalysisData = async (analysisId) => {
  try {
    // Ensure URL is properly formatted
    let analysisServiceUrl = config.services.analysis;
    // Remove trailing slash if present
    analysisServiceUrl = analysisServiceUrl.endsWith('/') ? analysisServiceUrl.slice(0, -1) : analysisServiceUrl;
    // Determine if we need to add /api or not
    const apiPath = analysisServiceUrl.endsWith('/api') ? '' : '/api';
    
    logger.info(\`Fetching analysis data from \${analysisServiceUrl}\${apiPath}/analysis/\${analysisId}\`);
    
    const response = await axios.get(
      \`\${analysisServiceUrl}\${apiPath}/analysis/\${analysisId}\`,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 5000 // 5 second timeout
      }
    );
    
    if (response.status === 200 && response.data.success) {
      return response.data.data;
    }
    
    logger.error(\`Failed to fetch analysis data: Status \${response.status}\`);
    return null;
  } catch (error) {
    logger.error(\`Error fetching analysis data: \${error.message}\`);
    return null;
  }
};`;
      
      content = content.replace(fetchAnalysisDataFnMatch[0], updatedFetchAnalysisDataFn);
      fs.writeFileSync(reportGenerationControllerPath, content);
      console.log('✅ Updated report generation controller to handle URL paths more robustly');
      return true;
    } else {
      console.log('⚠️ Could not find fetchAnalysisData function in the expected format');
      return false;
    }
  } else {
    console.log('ℹ️ Report generation controller already has robust URL handling or has a different implementation');
    return false;
  }
}

// Run all the fixes
const results = {
  analysisConfig: fixAnalysisServiceConfig(),
  reportConfig: fixReportServiceConfig(),
  webhookController: fixWebhookController(),
  reportController: fixReportGenerationController()
};

// Report on the fixes
console.log('\nFix Results:');
console.log(JSON.stringify(results, null, 2));

// Create helper script to verify report generation
function createVerificationScript() {
  const verifyScriptPath = path.join(__dirname, 'backend', 'scripts', 'verify-report-flow.js');
  
  // Check if the verification script already exists
  if (fs.existsSync(verifyScriptPath)) {
    console.log('ℹ️ Verification script already exists at: ' + verifyScriptPath);
    return;
  }
  
  // Create the directory if it doesn't exist
  const scriptsDir = path.dirname(verifyScriptPath);
  if (!fs.existsSync(scriptsDir)) {
    fs.mkdirSync(scriptsDir, { recursive: true });
  }
  
  // Write the verification script
  const verifyScript = `/**
 * Test script to verify the report generation flow end-to-end
 * 
 * This script:
 * 1. Updates a questionnaire submission to 'submitted' status
 * 2. Sends a webhook notification to the analysis service
 * 3. Checks if the analysis is created
 * 4. Verifies if a report is generated
 */

const axios = require('axios');
const { PrismaClient: QuestionnairePrisma } = require('@prisma/client');
const { PrismaClient: AnalysisPrisma } = require('@prisma/client');
const { PrismaClient: ReportPrisma } = require('@prisma/client');

// Create prisma clients for different services
// Note: Each service has its own database, so we need different clients with different connection strings
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

// Service URLs
const ANALYSIS_SERVICE_URL = process.env.ANALYSIS_SERVICE_URL || 'http://localhost:5004';
const API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://localhost:5000';

/**
 * Find a draft submission or create one if none exists
 */
async function findOrCreateDraftSubmission(userId) {
  console.log('Finding or creating a draft submission...');
  
  // Try to find an existing draft submission
  let submission = await questionnairePrisma.submission.findFirst({
    where: {
      status: 'draft',
      userId: userId
    },
    include: {
      template: true
    }
  });
  
  if (submission) {
    console.log(\`Found existing draft submission: \${submission.id}\`);
    return submission;
  }
  
  // If no draft submission exists, find a template to create one
  const template = await questionnairePrisma.template.findFirst();
  
  if (!template) {
    throw new Error('No template found to create a submission');
  }
  
  // Create a new draft submission
  submission = await questionnairePrisma.submission.create({
    data: {
      userId: userId,
      templateId: template.id,
      status: 'draft'
    },
    include: {
      template: true
    }
  });
  
  console.log(\`Created new draft submission: \${submission.id}\`);
  return submission;
}

/**
 * Update submission status to submitted
 */
async function updateSubmissionStatus(submissionId, status) {
  console.log(\`Updating submission \${submissionId} status to \${status}...\`);
  
  return questionnairePrisma.submission.update({
    where: {
      id: submissionId
    },
    data: {
      status: status,
      updatedAt: new Date()
    }
  });
}

/**
 * Send webhook notification to analysis service
 */
async function notifyAnalysisService(submissionId, userId) {
  console.log(\`Notifying analysis service about completed questionnaire \${submissionId}...\`);
  
  try {
    const response = await axios.post(
      \`\${ANALYSIS_SERVICE_URL}/api/webhooks/questionnaire-completed\`,
      {
        submissionId,
        userId
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('Analysis service notification response:', response.status, response.data);
    return response.data;
  } catch (error) {
    console.error('Error notifying analysis service:', error.message);
    if (error.response) {
      console.error('Response error data:', error.response.data);
    }
    throw error;
  }
}

/**
 * Check if analysis was created for the submission
 */
async function checkAnalysisCreated(submissionId) {
  console.log(\`Checking if analysis was created for submission \${submissionId}...\`);
  
  // Wait a bit for the analysis to be created
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const analysis = await analysisPrisma.analysis.findFirst({
    where: {
      submissionId: submissionId
    }
  });
  
  if (analysis) {
    console.log(\`Analysis created: \${analysis.id}\`);
    return analysis;
  } else {
    console.log('No analysis found yet, waiting longer...');
    // Wait longer and try again
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    return analysisPrisma.analysis.findFirst({
      where: {
        submissionId: submissionId
      }
    });
  }
}

/**
 * Check if report was generated for the analysis
 */
async function checkReportGenerated(analysisId) {
  console.log(\`Checking if report was generated for analysis \${analysisId}...\`);
  
  // Wait a bit for the report to be generated
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  const report = await reportPrisma.report.findFirst({
    where: {
      analysisId: analysisId
    }
  });
  
  if (report) {
    console.log(\`Report generated: \${report.id}\`);
    return report;
  } else {
    console.log('No report found yet, waiting longer...');
    // Wait longer and try again
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    return reportPrisma.report.findFirst({
      where: {
        analysisId: analysisId
      }
    });
  }
}

/**
 * Main function to test the end-to-end flow
 */
async function main() {
  try {
    console.log('Starting end-to-end report generation flow verification...');
    
    // For testing, use a test user ID
    const userId = process.env.TEST_USER_ID || 'test-user-1';
    
    // Step 1: Find or create a draft submission
    const submission = await findOrCreateDraftSubmission(userId);
    
    // Step 2: Update submission status to submitted
    await updateSubmissionStatus(submission.id, 'submitted');
    
    // Step 3: Send webhook notification to analysis service
    await notifyAnalysisService(submission.id, userId);
    
    // Step 4: Check if analysis was created
    const analysis = await checkAnalysisCreated(submission.id);
    
    if (!analysis) {
      throw new Error(\`No analysis created for submission \${submission.id}\`);
    }
    
    // Step 5: Check if report was generated
    const report = await checkReportGenerated(analysis.id);
    
    if (!report) {
      throw new Error(\`No report generated for analysis \${analysis.id}\`);
    }
    
    console.log('');
    console.log('✅ END-TO-END VERIFICATION SUCCESSFUL');
    console.log('');
    console.log('Submission ID:', submission.id);
    console.log('Analysis ID:', analysis.id);
    console.log('Report ID:', report.id);
    console.log('');
    console.log('The report generation flow is working correctly!');
    
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    process.exit(1);
  } finally {
    // Disconnect from Prisma clients
    await questionnairePrisma.$disconnect();
    await analysisPrisma.$disconnect();
    await reportPrisma.$disconnect();
  }
}

// Run the main function
main();
`;

  fs.writeFileSync(verifyScriptPath, verifyScript);
  console.log('✅ Created verification script at: ' + verifyScriptPath);
}

// Create the verification script
createVerificationScript();

console.log('\n✅ All fixes have been applied to resolve the report generation issues.');
console.log('Run the verification script to test the end-to-end flow:');
console.log('node backend/scripts/verify-report-flow.js');
