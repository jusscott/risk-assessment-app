#!/usr/bin/env node

/**
 * Comprehensive Questionnaire Loading Regression Diagnostic
 * 
 * This script diagnoses the questionnaire loading failure that occurred after
 * the progress restoration fix was implemented. It tests all questionnaire
 * endpoints and identifies the specific failure points.
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000';
const QUESTIONNAIRE_SERVICE_URL = 'http://localhost:5002';

// Test user credentials
const TEST_USER = {
  email: 'jusscott@gmail.com',
  password: 'Test123!'
};

let authToken = null;

console.log('='.repeat(80));
console.log('🔍 QUESTIONNAIRE LOADING REGRESSION DIAGNOSTIC');
console.log('='.repeat(80));
console.log();

/**
 * Enhanced logging function
 */
function log(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const levels = {
    'SUCCESS': '✅',
    'ERROR': '❌',
    'WARNING': '⚠️',
    'INFO': 'ℹ️',
    'DEBUG': '🔧'
  };
  
  console.log(`${levels[level]} [${timestamp}] ${message}`);
  if (data) {
    console.log('   Data:', typeof data === 'object' ? JSON.stringify(data, null, 2) : data);
  }
  console.log();
}

/**
 * Test user login and get authentication token
 */
async function testLogin() {
  log('INFO', 'Testing user authentication...');
  
  try {
    const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
      email: TEST_USER.email,
      password: TEST_USER.password
    });
    
    if (response.data && response.data.token) {
      authToken = response.data.token;
      log('SUCCESS', 'Authentication successful', {
        userId: response.data.user?.id,
        userEmail: response.data.user?.email
      });
      return true;
    } else {
      log('ERROR', 'Authentication failed: No token in response', response.data);
      return false;
    }
  } catch (error) {
    log('ERROR', 'Authentication failed', {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      data: error.response?.data
    });
    return false;
  }
}

/**
 * Test direct questionnaire service connectivity
 */
async function testQuestionnaireServiceDirect() {
  log('INFO', 'Testing direct questionnaire service connectivity...');
  
  try {
    const response = await axios.get(`${QUESTIONNAIRE_SERVICE_URL}/health`);
    log('SUCCESS', 'Questionnaire service is running', {
      status: response.status,
      data: response.data
    });
    return true;
  } catch (error) {
    log('ERROR', 'Questionnaire service connection failed', {
      status: error.response?.status,
      message: error.message
    });
    return false;
  }
}

/**
 * Test API Gateway routing to questionnaire service
 */
async function testApiGatewayRouting() {
  log('INFO', 'Testing API Gateway routing to questionnaire service...');
  
  if (!authToken) {
    log('ERROR', 'No auth token available for API Gateway test');
    return false;
  }
  
  try {
    const response = await axios.get(`${API_BASE_URL}/questionnaires/health`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    log('SUCCESS', 'API Gateway routing working', {
      status: response.status,
      data: response.data
    });
    return true;
  } catch (error) {
    log('ERROR', 'API Gateway routing failed', {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      data: error.response?.data
    });
    return false;
  }
}

/**
 * Test templates endpoint
 */
async function testTemplatesEndpoint() {
  log('INFO', 'Testing templates endpoint...');
  
  if (!authToken) {
    log('ERROR', 'No auth token available for templates test');
    return false;
  }
  
  try {
    const response = await axios.get(`${API_BASE_URL}/questionnaires/templates`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    log('SUCCESS', 'Templates endpoint working', {
      status: response.status,
      templatesCount: response.data?.data?.length || 0,
      templates: response.data?.data?.map(t => ({ id: t.id, name: t.name })) || []
    });
    return true;
  } catch (error) {
    log('ERROR', 'Templates endpoint failed', {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      data: error.response?.data
    });
    return false;
  }
}

/**
 * Test in-progress submissions endpoint
 */
async function testInProgressEndpoint() {
  log('INFO', 'Testing in-progress submissions endpoint...');
  
  if (!authToken) {
    log('ERROR', 'No auth token available for in-progress test');
    return false;
  }
  
  try {
    const response = await axios.get(`${API_BASE_URL}/questionnaires/submissions/in-progress`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    log('SUCCESS', 'In-progress submissions endpoint working', {
      status: response.status,
      submissionsCount: response.data?.data?.length || 0,
      submissions: response.data?.data?.map(s => ({ 
        id: s.id, 
        templateId: s.templateId,
        progress: s.progress,
        status: s.status 
      })) || []
    });
    return true;
  } catch (error) {
    log('ERROR', 'In-progress submissions endpoint failed', {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      data: error.response?.data
    });
    return false;
  }
}

/**
 * Test completed submissions endpoint
 */
async function testCompletedEndpoint() {
  log('INFO', 'Testing completed submissions endpoint...');
  
  if (!authToken) {
    log('ERROR', 'No auth token available for completed test');
    return false;
  }
  
  try {
    const response = await axios.get(`${API_BASE_URL}/questionnaires/submissions/completed`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    log('SUCCESS', 'Completed submissions endpoint working', {
      status: response.status,
      submissionsCount: response.data?.data?.length || 0,
      submissions: response.data?.data?.map(s => ({ 
        id: s.id, 
        templateId: s.templateId,
        status: s.status,
        completedAt: s.completedAt
      })) || []
    });
    return true;
  } catch (error) {
    log('ERROR', 'Completed submissions endpoint failed - THIS MATCHES USER REPORT', {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      data: error.response?.data
    });
    return false;
  }
}

/**
 * Test database connectivity for submissions
 */
async function testDatabaseSubmissions() {
  log('INFO', 'Testing database submissions query directly...');
  
  if (!authToken) {
    log('ERROR', 'No auth token available for database test');
    return false;
  }
  
  try {
    // Use the diagnostic endpoint to check database
    const response = await axios.get(`${QUESTIONNAIRE_SERVICE_URL}/diagnostic/submissions`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    log('SUCCESS', 'Database submissions query working', {
      status: response.status,
      data: response.data
    });
    return true;
  } catch (error) {
    log('ERROR', 'Database submissions query failed', {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      data: error.response?.data
    });
    return false;
  }
}

/**
 * Test user ID mapping and session consistency
 */
async function testUserSession() {
  log('INFO', 'Testing user session and ID mapping...');
  
  if (!authToken) {
    log('ERROR', 'No auth token available for session test');
    return false;
  }
  
  try {
    // Decode JWT token to get user info
    const tokenParts = authToken.split('.');
    const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
    
    log('INFO', 'JWT Token payload', {
      userId: payload.userId,
      email: payload.email,
      exp: new Date(payload.exp * 1000).toISOString()
    });
    
    // Test token validation
    const response = await axios.get(`${API_BASE_URL}/api/auth/validate`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    log('SUCCESS', 'Token validation successful', {
      status: response.status,
      userData: response.data
    });
    return true;
  } catch (error) {
    log('ERROR', 'User session test failed', {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      data: error.response?.data
    });
    return false;
  }
}

/**
 * Check for potential data corruption or migration issues
 */
async function checkDataIntegrity() {
  log('INFO', 'Checking data integrity and recent changes...');
  
  try {
    // Check if questionnaire service has any submissions at all
    const response = await axios.get(`${QUESTIONNAIRE_SERVICE_URL}/diagnostic/database-status`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    log('SUCCESS', 'Database status check completed', {
      status: response.status,
      data: response.data
    });
    return true;
  } catch (error) {
    log('WARNING', 'Database status check failed - endpoint may not exist', {
      status: error.response?.status,
      message: error.message
    });
    return false;
  }
}

/**
 * Main diagnostic function
 */
async function runDiagnostic() {
  console.log('Starting comprehensive questionnaire loading diagnostic...\n');
  
  const results = {
    login: false,
    serviceConnectivity: false,
    apiGatewayRouting: false,
    templates: false,
    inProgress: false,
    completed: false,
    databaseSubmissions: false,
    userSession: false,
    dataIntegrity: false
  };
  
  // Run all diagnostic tests
  results.login = await testLogin();
  results.serviceConnectivity = await testQuestionnaireServiceDirect();
  results.apiGatewayRouting = await testApiGatewayRouting();
  results.templates = await testTemplatesEndpoint();
  results.inProgress = await testInProgressEndpoint();
  results.completed = await testCompletedEndpoint();
  results.databaseSubmissions = await testDatabaseSubmissions();
  results.userSession = await testUserSession();
  results.dataIntegrity = await checkDataIntegrity();
  
  // Summary report
  console.log('='.repeat(80));
  console.log('📊 DIAGNOSTIC SUMMARY REPORT');
  console.log('='.repeat(80));
  console.log();
  
  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${test.padEnd(20)}: ${status}`);
  });
  
  console.log();
  
  // Analysis and recommendations
  console.log('🔍 ANALYSIS AND RECOMMENDATIONS');
  console.log('-'.repeat(50));
  
  if (!results.login) {
    console.log('❌ Authentication failure - Check user credentials and auth service');
  } else if (!results.serviceConnectivity) {
    console.log('❌ Questionnaire service is down - Check Docker containers');
  } else if (!results.apiGatewayRouting) {
    console.log('❌ API Gateway routing issue - Check path rewriting and service URL config');
  } else if (!results.templates) {
    console.log('❌ Templates endpoint failure - Check template controller and database');
  } else if (!results.inProgress && !results.completed) {
    console.log('❌ Both submission endpoints failing - Likely submission controller or database issue');
    console.log('   This matches the user report: "unable to see questionnaires at all"');
  } else if (!results.completed) {
    console.log('❌ Completed submissions endpoint failing - This matches user report');
    console.log('   Check submission controller\'s getCompletedSubmissions method');
  }
  
  if (!results.userSession) {
    console.log('⚠️  User session issues - Check token validation and user ID mapping');
  }
  
  if (!results.dataIntegrity) {
    console.log('⚠️  Data integrity check failed - May need database migration or repair');
  }
  
  console.log();
  console.log('🎯 RECOMMENDED NEXT STEPS:');
  
  if (results.login && results.serviceConnectivity && results.apiGatewayRouting) {
    console.log('1. Focus on submission controller - recent progress restoration fixes may have broken basic queries');
    console.log('2. Check database schema consistency after recent migrations');
    console.log('3. Verify user ID mapping in submission queries');
    console.log('4. Review recent changes to submission.controller.js');
    console.log('5. Check Prisma client configuration and query syntax');
  } else {
    console.log('1. Fix basic connectivity issues first');
    console.log('2. Ensure all services are running and properly configured');
    console.log('3. Check Docker containers and service health');
  }
  
  console.log();
  console.log('Diagnostic completed. Check the detailed logs above for specific error messages.');
}

// Run the diagnostic
runDiagnostic().catch(error => {
  console.error('Diagnostic script failed:', error);
  process.exit(1);
});
