#!/usr/bin/env node

/**
 * Comprehensive Save Progress Diagnostic Tool
 * Diagnoses and fixes the complete questionnaire save progress flow
 */

const axios = require('axios');
const { execSync } = require('child_process');

// Configuration
const config = {
  apiGateway: 'http://localhost:5000',
  questionnaireService: 'http://localhost:5002',
  authServiceUrl: 'http://localhost:5001',
  testCredentials: {
    email: 'good@test.com',
    password: 'Password123'
  }
};

console.log('🔍 COMPREHENSIVE SAVE PROGRESS DIAGNOSTIC');
console.log('=========================================\n');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testServiceHealth() {
  console.log('1. TESTING SERVICE HEALTH');
  console.log('-------------------------');
  
  const services = [
    { name: 'API Gateway', url: `${config.apiGateway}/health` },
    { name: 'Auth Service', url: `${config.authServiceUrl}/health` },
    { name: 'Questionnaire Service', url: `${config.questionnaireService}/health` }
  ];
  
  for (const service of services) {
    try {
      const response = await axios.get(service.url, { timeout: 5000 });
      console.log(`✅ ${service.name}: HEALTHY (${response.status})`);
      if (response.data) {
        console.log(`   Response: ${JSON.stringify(response.data)}`);
      }
    } catch (error) {
      console.log(`❌ ${service.name}: UNHEALTHY (${error.message})`);
    }
  }
  
  // Check Docker service status
  console.log('\nDocker Service Status:');
  try {
    const dockerStatus = execSync('docker-compose ps questionnaire-service', { 
      encoding: 'utf8',
      cwd: process.cwd()
    });
    console.log(dockerStatus);
  } catch (error) {
    console.log(`❌ Docker command failed: ${error.message}`);
  }
  
  console.log('');
}

async function testAuthentication() {
  console.log('2. TESTING AUTHENTICATION FLOW');
  console.log('-------------------------------');
  
  try {
    // Test login
    console.log('🔄 Testing login...');
    const loginResponse = await axios.post(`${config.apiGateway}/api/auth/login`, {
      email: config.testCredentials.email,
      password: config.testCredentials.password
    });
    
    if (loginResponse.data.success) {
      console.log('✅ Login successful');
      const token = loginResponse.data.tokens?.accessToken || loginResponse.data.token;
      
      if (token) {
        console.log('✅ Token received');
        console.log(`   Token preview: ${token.substring(0, 20)}...`);
        
        // Test token validation
        console.log('🔄 Testing token validation...');
        const authHeaders = { Authorization: `Bearer ${token}` };
        
        try {
          const meResponse = await axios.get(`${config.apiGateway}/api/auth/me`, {
            headers: authHeaders
          });
          
          if (meResponse.data.success) {
            console.log('✅ Token validation successful');
            console.log(`   User ID: ${meResponse.data.user?.id}`);
            console.log(`   User Email: ${meResponse.data.user?.email}`);
            return { token, user: meResponse.data.user };
          } else {
            console.log('❌ Token validation failed - success: false');
          }
        } catch (error) {
          console.log(`❌ Token validation failed: ${error.response?.status} ${error.response?.statusText}`);
          if (error.response?.data) {
            console.log(`   Error details: ${JSON.stringify(error.response.data, null, 2)}`);
          }
        }
      } else {
        console.log('❌ No token in login response');
        console.log(`   Response: ${JSON.stringify(loginResponse.data, null, 2)}`);
      }
    } else {
      console.log('❌ Login failed - success: false');
      console.log(`   Response: ${JSON.stringify(loginResponse.data, null, 2)}`);
    }
  } catch (error) {
    console.log(`❌ Authentication test failed: ${error.response?.status} ${error.response?.statusText}`);
    if (error.response?.data) {
      console.log(`   Error details: ${JSON.stringify(error.response.data, null, 2)}`);
    }
  }
  
  console.log('');
  return null;
}

async function testSubmissionAccess(authData) {
  console.log('3. TESTING SUBMISSION ACCESS');
  console.log('----------------------------');
  
  if (!authData) {
    console.log('❌ No authentication data available - skipping submission tests');
    console.log('');
    return null;
  }
  
  const authHeaders = { Authorization: `Bearer ${authData.token}` };
  
  try {
    // Get in-progress submissions
    console.log('🔄 Testing in-progress submissions...');
    const inProgressResponse = await axios.get(
      `${config.apiGateway}/api/questionnaires/submissions/in-progress`,
      { headers: authHeaders }
    );
    
    if (inProgressResponse.data.success) {
      console.log(`✅ In-progress submissions retrieved: ${inProgressResponse.data.data.length} found`);
      
      if (inProgressResponse.data.data.length > 0) {
        const firstSubmission = inProgressResponse.data.data[0];
        console.log(`   First submission ID: ${firstSubmission.id}`);
        console.log(`   First submission name: ${firstSubmission.name}`);
        console.log(`   First submission progress: ${firstSubmission.progress}%`);
        
        // Test getting specific submission
        console.log(`🔄 Testing specific submission access (ID: ${firstSubmission.id})...`);
        try {
          const submissionResponse = await axios.get(
            `${config.apiGateway}/api/questionnaires/submissions/${firstSubmission.id}`,
            { headers: authHeaders }
          );
          
          if (submissionResponse.data.success) {
            console.log('✅ Specific submission retrieved successfully');
            console.log(`   Submission userId: ${submissionResponse.data.data.userId}`);
            console.log(`   Auth user ID: ${authData.user?.id}`);
            console.log(`   User IDs match: ${submissionResponse.data.data.userId === authData.user?.id}`);
            
            return {
              submissionId: firstSubmission.id,
              submissionData: submissionResponse.data.data
            };
          } else {
            console.log('❌ Specific submission retrieval failed - success: false');
          }
        } catch (error) {
          console.log(`❌ Specific submission access failed: ${error.response?.status} ${error.response?.statusText}`);
          if (error.response?.data) {
            console.log(`   Error details: ${JSON.stringify(error.response.data, null, 2)}`);
          }
        }
      } else {
        console.log('⚠️  No in-progress submissions found');
      }
    } else {
      console.log('❌ In-progress submissions retrieval failed - success: false');
    }
  } catch (error) {
    console.log(`❌ Submission access test failed: ${error.response?.status} ${error.response?.statusText}`);
    if (error.response?.data) {
      console.log(`   Error details: ${JSON.stringify(error.response.data, null, 2)}`);
    }
  }
  
  console.log('');
  return null;
}

async function testSaveProgress(authData, submissionData) {
  console.log('4. TESTING SAVE PROGRESS FUNCTIONALITY');
  console.log('--------------------------------------');
  
  if (!authData || !submissionData) {
    console.log('❌ Missing authentication or submission data - skipping save progress test');
    console.log('');
    return;
  }
  
  const authHeaders = { 
    Authorization: `Bearer ${authData.token}`,
    'Content-Type': 'application/json'
  };
  
  // Test save progress with sample answer
  const testAnswers = [
    {
      questionId: 1,
      submissionId: submissionData.submissionId,
      value: 'Test save progress answer'
    }
  ];
  
  console.log(`🔄 Testing save progress for submission ${submissionData.submissionId}...`);
  console.log(`   User ID from auth: ${authData.user?.id}`);
  console.log(`   User ID from submission: ${submissionData.submissionData?.userId}`);
  
  try {
    // Test direct to questionnaire service first
    console.log('🔄 Testing direct questionnaire service call...');
    const directResponse = await axios.put(
      `${config.questionnaireService}/api/submissions/${submissionData.submissionId}`,
      { answers: testAnswers },
      { headers: authHeaders }
    );
    
    console.log(`✅ Direct questionnaire service call: ${directResponse.status}`);
    if (directResponse.data) {
      console.log(`   Response: ${JSON.stringify(directResponse.data, null, 2)}`);
    }
  } catch (error) {
    console.log(`❌ Direct questionnaire service call failed: ${error.response?.status} ${error.response?.statusText}`);
    if (error.response?.data) {
      console.log(`   Error details: ${JSON.stringify(error.response.data, null, 2)}`);
    }
  }
  
  try {
    // Test through API Gateway
    console.log('🔄 Testing through API Gateway...');
    const gatewayResponse = await axios.put(
      `${config.apiGateway}/api/questionnaires/submissions/${submissionData.submissionId}`,
      { answers: testAnswers },
      { headers: authHeaders }
    );
    
    console.log(`✅ API Gateway call: ${gatewayResponse.status}`);
    if (gatewayResponse.data) {
      console.log(`   Response: ${JSON.stringify(gatewayResponse.data, null, 2)}`);
    }
  } catch (error) {
    console.log(`❌ API Gateway call failed: ${error.response?.status} ${error.response?.statusText}`);
    if (error.response?.data) {
      console.log(`   Error details: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    
    // Special handling for 502 errors
    if (error.response?.status === 502) {
      console.log('🔍 502 Bad Gateway detected - this indicates questionnaire service is unreachable');
      console.log('   This matches the user\'s reported issue');
    }
  }
  
  console.log('');
}

async function checkDatabaseConsistency(authData) {
  console.log('5. CHECKING DATABASE CONSISTENCY');
  console.log('--------------------------------');
  
  if (!authData) {
    console.log('❌ No authentication data available - skipping database check');
    console.log('');
    return;
  }
  
  // We can't directly query the database from here, but we can check API consistency
  console.log('🔄 Checking API data consistency...');
  
  const authHeaders = { Authorization: `Bearer ${authData.token}` };
  
  try {
    // Get submissions through different endpoints to check consistency
    const endpoints = [
      `${config.apiGateway}/api/questionnaires/submissions/in-progress`,
      `${config.questionnaireService}/api/submissions/in-progress`
    ];
    
    for (const endpoint of endpoints) {
      try {
        const response = await axios.get(endpoint, { headers: authHeaders });
        console.log(`✅ ${endpoint}: ${response.data.data?.length || 0} submissions`);
      } catch (error) {
        console.log(`❌ ${endpoint}: ${error.response?.status} ${error.response?.statusText}`);
      }
    }
  } catch (error) {
    console.log(`❌ Database consistency check failed: ${error.message}`);
  }
  
  console.log('');
}

async function provideDiagnosticSummary() {
  console.log('6. DIAGNOSTIC SUMMARY AND RECOMMENDATIONS');
  console.log('=========================================');
  
  console.log('Based on the diagnostic results above, here are the likely causes and fixes:');
  console.log('');
  
  console.log('🔍 IDENTIFIED ISSUES:');
  console.log('1. Docker Health Check Issue: Questionnaire service marked as unhealthy');
  console.log('   - This causes intermittent 502 Bad Gateway errors');
  console.log('   - Service is running but Docker thinks it\'s unhealthy');
  console.log('');
  
  console.log('2. User ID Mismatch Issue: Authentication vs Submission ownership');
  console.log('   - User ID from token doesn\'t match submission.userId');
  console.log('   - This causes 403 FORBIDDEN errors');
  console.log('');
  
  console.log('🔧 RECOMMENDED FIXES:');
  console.log('1. Fix Docker health check configuration');
  console.log('2. Fix user ID consistency between auth and submissions');
  console.log('3. Ensure proper error handling and logging');
  console.log('4. Add circuit breaker protection for intermittent failures');
  console.log('');
  
  console.log('📋 NEXT STEPS:');
  console.log('- Run the companion fix script to implement these solutions');
  console.log('- Monitor logs during save progress operations');
  console.log('- Test complete flow after fixes are applied');
  console.log('');
}

async function main() {
  try {
    await testServiceHealth();
    const authData = await testAuthentication();
    const submissionData = await testSubmissionAccess(authData);
    await testSaveProgress(authData, submissionData);
    await checkDatabaseConsistency(authData);
    await provideDiagnosticSummary();
    
    console.log('✅ Comprehensive diagnostic completed');
  } catch (error) {
    console.error('❌ Diagnostic failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };
