#!/usr/bin/env node

/**
 * Comprehensive Questionnaire Loading Diagnostic Tool
 * 
 * This script diagnoses the persistent "unable to load questionnaires" issue by testing:
 * 1. Database connectivity for questionnaire service
 * 2. API endpoint availability and responses
 * 3. Authentication token validation flow
 * 4. User ID format consistency between services
 * 5. Data integrity in the questionnaire database
 */

const axios = require('axios');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Configuration
const config = {
  apiGateway: process.env.API_GATEWAY_URL || 'http://localhost:4000',
  questionnaireService: process.env.QUESTIONNAIRE_SERVICE_URL || 'http://localhost:3003',
  authService: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
  timeout: 10000
};

// Test user credentials for authentication
const testUser = {
  email: 'test@example.com',
  password: 'testpassword123'
};

let authToken = null;
let testResults = [];

/**
 * Log test results with consistent formatting
 */
function logTest(testName, status, details = '', error = null) {
  const timestamp = new Date().toISOString();
  const result = { timestamp, testName, status, details, error: error?.message };
  testResults.push(result);
  
  const statusSymbol = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  console.log(`${statusSymbol} [${timestamp}] ${testName}: ${status}`);
  if (details) console.log(`   Details: ${details}`);
  if (error) console.log(`   Error: ${error.message}`);
  console.log('');
}

/**
 * Test 1: Database Connectivity for Questionnaire Service
 */
async function testQuestionnaireServiceDatabase() {
  console.log('🔍 Testing Questionnaire Service Database Connectivity...\n');
  
  try {
    // Test if questionnaire service is running
    const healthResponse = await axios.get(`${config.questionnaireService}/health`, {
      timeout: config.timeout
    });
    
    if (healthResponse.status === 200) {
      logTest('Questionnaire Service Health Check', 'PASS', 'Service is running');
    } else {
      logTest('Questionnaire Service Health Check', 'FAIL', `Unexpected status: ${healthResponse.status}`);
    }
  } catch (error) {
    logTest('Questionnaire Service Health Check', 'FAIL', 'Service unreachable', error);
    return false;
  }
  
  try {
    // Test database connectivity through diagnostic endpoint
    const dbTestResponse = await axios.get(`${config.questionnaireService}/api/diagnostic/database`, {
      timeout: config.timeout
    });
    
    if (dbTestResponse.data.success) {
      logTest('Database Connectivity Test', 'PASS', `Connected to database: ${dbTestResponse.data.data.database}`);
      return true;
    } else {
      logTest('Database Connectivity Test', 'FAIL', dbTestResponse.data.message || 'Database connection failed');
      return false;
    }
  } catch (error) {
    logTest('Database Connectivity Test', 'FAIL', 'Could not test database connectivity', error);
    return false;
  }
}

/**
 * Test 2: Authentication Flow
 */
async function testAuthenticationFlow() {
  console.log('🔑 Testing Authentication Flow...\n');
  
  try {
    // Try to login with test credentials
    const loginResponse = await axios.post(`${config.apiGateway}/api/auth/login`, {
      email: testUser.email,
      password: testUser.password
    }, {
      timeout: config.timeout
    });
    
    if (loginResponse.data.success && loginResponse.data.data.token) {
      authToken = loginResponse.data.data.token;
      logTest('User Authentication', 'PASS', `Token received for user: ${loginResponse.data.data.user.email}`);
      
      // Test token validation
      const validateResponse = await axios.post(`${config.authService}/validate-token`, {}, {
        headers: { Authorization: `Bearer ${authToken}` },
        timeout: config.timeout
      });
      
      if (validateResponse.data.success) {
        const user = validateResponse.data.data.user;
        logTest('Token Validation', 'PASS', `User ID: ${user.id}, Email: ${user.email}, Role: ${user.role}`);
        return { success: true, user };
      } else {
        logTest('Token Validation', 'FAIL', 'Token validation failed');
        return { success: false };
      }
    } else {
      logTest('User Authentication', 'FAIL', 'Login failed - invalid credentials or service error');
      return { success: false };
    }
  } catch (error) {
    if (error.response?.status === 401) {
      logTest('User Authentication', 'WARN', 'Test user not found - will create test user', error);
      return await createTestUser();
    } else {
      logTest('User Authentication', 'FAIL', 'Authentication service error', error);
      return { success: false };
    }
  }
}

/**
 * Create test user if not exists
 */
async function createTestUser() {
  try {
    console.log('👤 Creating test user...\n');
    
    const registerResponse = await axios.post(`${config.apiGateway}/api/auth/register`, {
      email: testUser.email,
      password: testUser.password,
      name: 'Test User'
    }, {
      timeout: config.timeout
    });
    
    if (registerResponse.data.success) {
      authToken = registerResponse.data.data.token;
      logTest('Test User Creation', 'PASS', `Test user created with ID: ${registerResponse.data.data.user.id}`);
      return { success: true, user: registerResponse.data.data.user };
    } else {
      logTest('Test User Creation', 'FAIL', 'Could not create test user');
      return { success: false };
    }
  } catch (error) {
    logTest('Test User Creation', 'FAIL', 'Error creating test user', error);
    return { success: false };
  }
}

/**
 * Test 3: API Gateway Routing to Questionnaire Service
 */
async function testApiGatewayRouting() {
  console.log('🌐 Testing API Gateway Routing...\n');
  
  if (!authToken) {
    logTest('API Gateway Routing Test', 'SKIP', 'No auth token available');
    return false;
  }
  
  const endpoints = [
    { path: '/api/questionnaires/templates', name: 'Templates Endpoint' },
    { path: '/api/questionnaires/submissions/in-progress', name: 'In-Progress Submissions Endpoint' },
    { path: '/api/questionnaires/submissions/completed', name: 'Completed Submissions Endpoint' }
  ];
  
  let routingWorking = true;
  
  for (const endpoint of endpoints) {
    try {
      const response = await axios.get(`${config.apiGateway}${endpoint.path}`, {
        headers: { Authorization: `Bearer ${authToken}` },
        timeout: config.timeout
      });
      
      if (response.data.success !== undefined) {
        logTest(`${endpoint.name} Routing`, 'PASS', `Status: ${response.status}, Success: ${response.data.success}`);
      } else {
        logTest(`${endpoint.name} Routing`, 'WARN', `Reached endpoint but unexpected response format`);
      }
    } catch (error) {
      logTest(`${endpoint.name} Routing`, 'FAIL', `Cannot reach endpoint through API Gateway`, error);
      routingWorking = false;
    }
  }
  
  return routingWorking;
}

/**
 * Test 4: Direct Questionnaire Service Access
 */
async function testDirectQuestionnaireServiceAccess() {
  console.log('🎯 Testing Direct Questionnaire Service Access...\n');
  
  if (!authToken) {
    logTest('Direct Service Access Test', 'SKIP', 'No auth token available');
    return false;
  }
  
  const endpoints = [
    { path: '/api/templates', name: 'Templates Direct Access' },
    { path: '/api/submissions/in-progress', name: 'In-Progress Submissions Direct Access' },
    { path: '/api/submissions/completed', name: 'Completed Submissions Direct Access' }
  ];
  
  let directAccessWorking = true;
  
  for (const endpoint of endpoints) {
    try {
      const response = await axios.get(`${config.questionnaireService}${endpoint.path}`, {
        headers: { Authorization: `Bearer ${authToken}` },
        timeout: config.timeout
      });
      
      if (response.data.success !== undefined) {
        logTest(`${endpoint.name}`, 'PASS', `Data items: ${Array.isArray(response.data.data) ? response.data.data.length : 'N/A'}`);
      } else {
        logTest(`${endpoint.name}`, 'WARN', 'Unexpected response format');
      }
    } catch (error) {
      logTest(`${endpoint.name}`, 'FAIL', 'Direct access failed', error);
      directAccessWorking = false;
    }
  }
  
  return directAccessWorking;
}

/**
 * Test 5: Database Data Integrity
 */
async function testDatabaseDataIntegrity() {
  console.log('📊 Testing Database Data Integrity...\n');
  
  try {
    // Test if there are any templates in the database
    const templatesResponse = await axios.get(`${config.questionnaireService}/api/diagnostic/templates-count`, {
      timeout: config.timeout
    });
    
    if (templatesResponse.data.success) {
      const count = templatesResponse.data.data.count;
      if (count > 0) {
        logTest('Templates Data', 'PASS', `Found ${count} templates in database`);
      } else {
        logTest('Templates Data', 'WARN', 'No templates found in database - may need seeding');
      }
    }
  } catch (error) {
    logTest('Templates Data', 'FAIL', 'Could not check templates data', error);
  }
  
  try {
    // Test if there are any users with submissions
    const submissionsResponse = await axios.get(`${config.questionnaireService}/api/diagnostic/submissions-count`, {
      timeout: config.timeout
    });
    
    if (submissionsResponse.data.success) {
      const count = submissionsResponse.data.data.count;
      logTest('Submissions Data', 'PASS', `Found ${count} submissions in database`);
    }
  } catch (error) {
    logTest('Submissions Data', 'FAIL', 'Could not check submissions data', error);
  }
}

/**
 * Test 6: User ID Consistency Check
 */
async function testUserIdConsistency(authUser) {
  console.log('🔗 Testing User ID Consistency Between Services...\n');
  
  if (!authUser || !authToken) {
    logTest('User ID Consistency Test', 'SKIP', 'No authenticated user available');
    return;
  }
  
  try {
    // Check what user ID the questionnaire service sees
    const userInfoResponse = await axios.get(`${config.questionnaireService}/api/diagnostic/user-info`, {
      headers: { Authorization: `Bearer ${authToken}` },
      timeout: config.timeout
    });
    
    if (userInfoResponse.data.success) {
      const questionnaireServiceUserId = userInfoResponse.data.data.userId;
      const authServiceUserId = authUser.id;
      
      if (questionnaireServiceUserId === authServiceUserId) {
        logTest('User ID Consistency', 'PASS', `Both services see user ID: ${authServiceUserId}`);
      } else {
        logTest('User ID Consistency', 'FAIL', 
          `ID mismatch - Auth: ${authServiceUserId}, Questionnaire: ${questionnaireServiceUserId}`);
      }
    }
  } catch (error) {
    logTest('User ID Consistency', 'FAIL', 'Could not verify user ID consistency', error);
  }
}

/**
 * Generate summary report and recommendations
 */
function generateSummaryReport() {
  console.log('📋 DIAGNOSTIC SUMMARY REPORT\n');
  console.log('=' .repeat(60));
  
  const passCount = testResults.filter(r => r.status === 'PASS').length;
  const failCount = testResults.filter(r => r.status === 'FAIL').length;
  const warnCount = testResults.filter(r => r.status === 'WARN').length;
  const skipCount = testResults.filter(r => r.status === 'SKIP').length;
  
  console.log(`Total Tests: ${testResults.length}`);
  console.log(`✅ Passed: ${passCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`⚠️  Warnings: ${warnCount}`);
  console.log(`⏭️  Skipped: ${skipCount}\n`);
  
  // Identify critical failures
  const criticalFailures = testResults.filter(r => 
    r.status === 'FAIL' && (
      r.testName.includes('Database') ||
      r.testName.includes('Authentication') ||
      r.testName.includes('Routing')
    )
  );
  
  if (criticalFailures.length > 0) {
    console.log('🚨 CRITICAL ISSUES FOUND:\n');
    criticalFailures.forEach(failure => {
      console.log(`❌ ${failure.testName}: ${failure.details}`);
      if (failure.error) console.log(`   Error: ${failure.error}`);
    });
    console.log('');
  }
  
  // Generate recommendations
  console.log('💡 RECOMMENDATIONS:\n');
  
  if (testResults.some(r => r.testName.includes('Database') && r.status === 'FAIL')) {
    console.log('1. 🔧 Fix database connectivity for questionnaire service');
    console.log('   - Check if questionnaire service container is running');
    console.log('   - Verify database connection string in environment variables');
    console.log('   - Check if database migrations have been applied');
    console.log('');
  }
  
  if (testResults.some(r => r.testName.includes('Templates Data') && r.status === 'WARN')) {
    console.log('2. 🌱 Seed the database with template data');
    console.log('   - Run: cd backend/questionnaire-service && npm run seed');
    console.log('   - Or: docker-compose exec questionnaire-service npm run seed');
    console.log('');
  }
  
  if (testResults.some(r => r.testName.includes('Authentication') && r.status === 'FAIL')) {
    console.log('3. 🔑 Fix authentication service issues');
    console.log('   - Check if auth service is running and accessible');
    console.log('   - Verify JWT secret configuration consistency');
    console.log('   - Check user registration/login endpoints');
    console.log('');
  }
  
  if (testResults.some(r => r.testName.includes('Routing') && r.status === 'FAIL')) {
    console.log('4. 🌐 Fix API Gateway routing configuration');
    console.log('   - Check path rewriting rules for questionnaire endpoints');
    console.log('   - Verify service URL configuration in API Gateway');
    console.log('   - Test service discovery and load balancing');
    console.log('');
  }
  
  if (testResults.some(r => r.testName.includes('User ID Consistency') && r.status === 'FAIL')) {
    console.log('5. 🔗 Fix user ID format consistency between services');
    console.log('   - Ensure auth service and questionnaire service use same ID format');
    console.log('   - Check token payload structure and user model alignment');
    console.log('');
  }
  
  console.log('=' .repeat(60));
  console.log(`Report generated at: ${new Date().toISOString()}`);
}

/**
 * Main diagnostic execution
 */
async function runDiagnostics() {
  console.log('🚀 Starting Questionnaire Loading Diagnostics...\n');
  console.log('Configuration:');
  console.log(`- API Gateway: ${config.apiGateway}`);
  console.log(`- Questionnaire Service: ${config.questionnaireService}`);
  console.log(`- Auth Service: ${config.authService}`);
  console.log(`- Timeout: ${config.timeout}ms\n`);
  
  try {
    // Run all diagnostic tests
    await testQuestionnaireServiceDatabase();
    const authResult = await testAuthenticationFlow();
    await testApiGatewayRouting();
    await testDirectQuestionnaireServiceAccess();
    await testDatabaseDataIntegrity();
    
    if (authResult.success) {
      await testUserIdConsistency(authResult.user);
    }
    
    // Generate final report
    generateSummaryReport();
    
  } catch (error) {
    console.error('❌ Diagnostic execution failed:', error.message);
    process.exit(1);
  }
}

// Execute diagnostics if run directly
if (require.main === module) {
  runDiagnostics().catch(error => {
    console.error('❌ Fatal error during diagnostics:', error);
    process.exit(1);
  });
}

module.exports = { runDiagnostics, config };
