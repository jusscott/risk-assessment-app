/**
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
    console.log(`Found existing draft submission: ${submission.id}`);
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
  
  console.log(`Created new draft submission: ${submission.id}`);
  return submission;
}

/**
 * Update submission status to submitted
 */
async function updateSubmissionStatus(submissionId, status) {
  console.log(`Updating submission ${submissionId} status to ${status}...`);
  
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
  console.log(`Notifying analysis service about completed questionnaire ${submissionId}...`);
  
  try {
    const response = await axios.post(
      `${ANALYSIS_SERVICE_URL}/api/webhooks/questionnaire-completed`,
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
  console.log(`Checking if analysis was created for submission ${submissionId}...`);
  
  // Wait a bit for the analysis to be created
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const analysis = await analysisPrisma.analysis.findFirst({
    where: {
      submissionId: submissionId
    }
  });
  
  if (analysis) {
    console.log(`Analysis created: ${analysis.id}`);
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
  console.log(`Checking if report was generated for analysis ${analysisId}...`);
  
  // Wait a bit for the report to be generated
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  const report = await reportPrisma.report.findFirst({
    where: {
      analysisId: analysisId
    }
  });
  
  if (report) {
    console.log(`Report generated: ${report.id}`);
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
      throw new Error(`No analysis created for submission ${submission.id}`);
    }
    
    // Step 5: Check if report was generated
    const report = await checkReportGenerated(analysis.id);
    
    if (!report) {
      throw new Error(`No report generated for analysis ${analysis.id}`);
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
