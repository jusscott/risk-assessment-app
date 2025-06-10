#!/usr/bin/env node

/**
 * Comprehensive diagnostic script for questionnaire save progress 502 errors
 * Tests the complete submission update flow to identify where the 502 error originates
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000';
const QUESTIONNAIRE_SERVICE_URL = 'http://localhost:5002';

// Test credentials
const TEST_USER = {
  email: 'good@test.com',
  password: 'Password123'
};

let authToken = null;

async function login() {
  console.log('🔐 Step 1: Logging in to get auth token...');
  
  try {
    const response = await axios.post(`${API_BASE_URL}/api/auth/login`, TEST_USER);
    
    if (response.data.success && response.data.data.tokens) {
      authToken = response.data.data.tokens.accessToken;
      console.log('✅ Login successful');
      console.log(`📝 Token length: ${authToken.length}`);
      return true;
    } else {
      console.error('❌ Login failed - no token received');
      console.log('Response:', JSON.stringify(response.data, null, 2));
      return false;
    }
  } catch (error) {
    console.error('❌ Login failed:', error.message);
    if (error.response) {
      console.log('Error response:', JSON.stringify(error.response.data, null, 2));
    }
    return false;
  }
}

async function testDirectSubmissionEndpoint() {
  console.log('\n🔍 Step 2: Testing direct questionnaire service submission endpoint...');
  
  if (!authToken) {
    console.log('❌ No auth token available for direct test');
    return false;
  }
  
  try {
    // Test direct access to questionnaire service submissions endpoint
    const response = await axios.get(`${QUESTIONNAIRE_SERVICE_URL}/api/submissions`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    console.log('✅ Direct questionnaire service submissions endpoint accessible');
    console.log(`📊 Response status: ${response.status}`);
    return true;
  } catch (error) {
    console.error('❌ Direct questionnaire service test failed:', error.message);
    
    if (error.code === 'ECONNABORTED') {
      console.log('⏱️ Request timed out - service may be hanging');
    } else if (error.response) {
      console.log(`📊 Response status: ${error.response.status}`);
      console.log('Response data:', JSON.stringify(error.response.data, null, 2));
    }
    return false;
  }
}

async function testAPIGatewaySubmissionEndpoint() {
  console.log('\n🌐 Step 3: Testing API Gateway submission endpoint...');
  
  if (!authToken) {
    console.log('❌ No auth token available for API Gateway test');
    return false;
  }
  
  try {
    // Test API Gateway submissions endpoint  
    const response = await axios.get(`${API_BASE_URL}/api/questionnaires/submissions`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 15000
    });
    
    console.log('✅ API Gateway submissions endpoint accessible');
    console.log(`📊 Response status: ${response.status}`);
    return true;
  } catch (error) {
    console.error('❌ API Gateway submissions test failed:', error.message);
    
    if (error.code === 'ECONNABORTED') {
      console.log('⏱️ Request timed out - service may be hanging');
    } else if (error.response) {
      console.log(`📊 Response status: ${error.response.status}`);
      console.log('Response data:', JSON.stringify(error.response.data, null, 2));
      
      if (error.response.status === 502) {
        console.log('🚨 502 Bad Gateway error confirmed - questionnaire service is unresponsive');
      }
    }
    return false;
  }
}

async function testSubmissionUpdate() {
  console.log('\n📝 Step 4: Testing submission update (save progress)...');
  
  if (!authToken) {
    console.log('❌ No auth token available for submission update test');
    return false;
  }
  
  try {
    // First, try to get existing submissions to find one to update
    console.log('📋 Getting existing submissions...');
    
    const submissionsResponse = await axios.get(`${API_BASE_URL}/api/questionnaires/submissions/in-progress`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    if (submissionsResponse.data.success && submissionsResponse.data.data.length > 0) {
      const submissionId = submissionsResponse.data.data[0].id;
      console.log(`📝 Found submission ID: ${submissionId}`);
      
      // Test updating this submission
      const updateData = {
        answers: [
          { questionId: 1, value: 'Test answer for diagnostic' }
        ]
      };
      
      console.log(`🔄 Attempting to update submission ${submissionId}...`);
      
      const updateResponse = await axios.put(
        `${API_BASE_URL}/api/questionnaires/submissions/${submissionId}`,
        updateData,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );
      
      console.log('✅ Submission update successful');
      console.log(`📊 Response status: ${updateResponse.status}`);
      return true;
      
    } else {
      console.log('⚠️ No in-progress submissions found for testing update');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Submission update test failed:', error.message);
    
    if (error.code === 'ECONNABORTED') {
      console.log('⏱️ Request timed out - authentication middleware may be hanging');
    } else if (error.response) {
      console.log(`📊 Response status: ${error.response.status}`);
      
      if (error.response.status === 502) {
        console.log('🚨 502 Bad Gateway error during submission update');
        console.log('🔍 This confirms the issue is in the questionnaire service authentication flow');
      }
    }
    return false;
  }
}

async function testHealthChecks() {
  console.log('\n🏥 Step 5: Testing service health checks...');
  
  const healthChecks = [
    { name: 'API Gateway', url: `${API_BASE_URL}/health` },
    { name: 'Questionnaire Service', url: `${QUESTIONNAIRE_SERVICE_URL}/health` },
    { name: 'Questionnaire Service API Health', url: `${QUESTIONNAIRE_SERVICE_URL}/api/health` }
  ];
  
  for (const check of healthChecks) {
    try {
      const response = await axios.get(check.url, { timeout: 5000 });
      console.log(`✅ ${check.name} health check: OK (${response.status})`);
    } catch (error) {
      console.log(`❌ ${check.name} health check: FAILED`);
      if (error.response) {
        console.log(`   Status: ${error.response.status}`);
      } else {
        console.log(`   Error: ${error.message}`);
      }
    }
  }
}

async function main() {
  console.log('🚀 Starting comprehensive 502 error diagnostic...\n');
  
  // Step 1: Login
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('\n❌ Cannot proceed without authentication token');
    process.exit(1);
  }
  
  // Step 2: Test direct questionnaire service
  await testDirectSubmissionEndpoint();
  
  // Step 3: Test API Gateway
  await testAPIGatewaySubmissionEndpoint();
  
  // Step 4: Test submission update (the actual failing operation)
  await testSubmissionUpdate();
  
  // Step 5: Test health checks
  await testHealthChecks();
  
  console.log('\n📊 Diagnostic Summary:');
  console.log('- If Step 2 fails with timeout: Auth middleware is hanging');
  console.log('- If Step 3 returns 502: API Gateway cannot reach questionnaire service');
  console.log('- If Step 4 returns 502: Save progress operation specifically failing');
  console.log('- Health checks show if services are fundamentally responsive');
  
  console.log('\n🔧 Recommended Fix:');
  console.log('- Simplify the auth middleware to reduce complexity');
  console.log('- Add timeout protection to prevent hanging requests');
  console.log('- Implement request queuing to handle concurrent auth requests');
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Diagnostic interrupted');
  process.exit(0);
});

main().catch(error => {
  console.error('\n💥 Diagnostic script failed:', error.message);
  process.exit(1);
});
