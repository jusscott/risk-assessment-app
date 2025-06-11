#!/usr/bin/env node

const axios = require('axios');

// Configuration  
const CONFIG = {
  API_GATEWAY: 'http://localhost:5000',
  QUESTIONNAIRE_SERVICE: 'http://localhost:5002'
};

async function testSubmissionEndpointsWithAuth() {
  console.log('🔍 Testing Submission Endpoints with Real Authentication');
  console.log('=' + '='.repeat(60));
  
  try {
    // Step 1: Login to get real auth token
    console.log('\n1. Logging in to get authentication token:');
    
    let authToken = null;
    try {
      const loginResponse = await axios.post(`${CONFIG.API_GATEWAY}/api/auth/login`, {
        email: 'good@test.com',
        password: 'Password123'
      });
      
      // Debug: Log response structure to understand token location
      console.log('   Login response data:', JSON.stringify(loginResponse.data, null, 2));
      
      authToken = loginResponse.data.tokens?.accessToken || 
                  loginResponse.data.token || 
                  loginResponse.data.accessToken ||
                  loginResponse.data.data?.tokens?.accessToken ||
                  loginResponse.data.data?.token ||
                  loginResponse.data.data?.accessToken;
      
      console.log(`✅ Login successful, token acquired: ${authToken ? 'Yes' : 'No'}`);
      if (authToken) {
        console.log(`   Token preview: ${authToken.substring(0, 20)}...`);
      }
    } catch (error) {
      console.log(`❌ Login failed: ${error.response?.status || error.message}`);
      return; // Can't continue without auth token
    }
    
    // Step 2: Test API Gateway submission endpoints with real auth
    console.log('\n2. Testing API Gateway Submission Endpoints:');
    
    const headers = {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    };
    
    // Test GET in-progress
    try {
      const getResponse = await axios.get(`${CONFIG.API_GATEWAY}/api/submissions/in-progress`, { headers });
      console.log(`✅ GET /api/submissions/in-progress: ${getResponse.status} - ${getResponse.data.length || 0} submissions`);
    } catch (error) {
      console.log(`❌ GET /api/submissions/in-progress: ${error.response?.status || error.message}`);
    }
    
    // Test direct service endpoints with real auth
    console.log('\n3. Testing Direct Service Submission Endpoints:');
    
    // Test GET in-progress (direct)
    try {
      const directGetResponse = await axios.get(`${CONFIG.QUESTIONNAIRE_SERVICE}/submissions/in-progress`, { headers });
      console.log(`✅ Direct GET /submissions/in-progress: ${directGetResponse.status} - ${directGetResponse.data.length || 0} submissions`);
    } catch (error) {
      console.log(`❌ Direct GET /submissions/in-progress: ${error.response?.status || error.message}`);
    }
    
    // Step 3: Test PUT requests if we have submission data
    console.log('\n4. Testing PUT Requests:');
    
    const testPayload = {
      answers: {
        "1": "Test answer for diagnosis"
      }
    };
    
    // Test PUT through API Gateway
    try {
      const putResponse = await axios.put(`${CONFIG.API_GATEWAY}/api/submissions/1`, testPayload, { 
        headers,
        timeout: 10000 
      });
      console.log(`✅ PUT /api/submissions/1 (API Gateway): ${putResponse.status}`);
    } catch (error) {
      console.log(`❌ PUT /api/submissions/1 (API Gateway): ${error.response?.status || error.code || error.message}`);
    }
    
    // Test PUT direct to service
    try {
      const directPutResponse = await axios.put(`${CONFIG.QUESTIONNAIRE_SERVICE}/submissions/1`, testPayload, { 
        headers,
        timeout: 10000 
      });
      console.log(`✅ PUT /submissions/1 (Direct): ${directPutResponse.status}`);
    } catch (error) {
      console.log(`❌ PUT /submissions/1 (Direct): ${error.response?.status || error.code || error.message}`);
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('🔍 Analysis Summary:');
    console.log('- If direct service calls work but API Gateway fails, routing issue exists');
    console.log('- If both work, the save progress functionality should be restored');
    console.log('- If both fail with specific errors, we can debug the exact issue');
    
  } catch (error) {
    console.error('❌ Test script error:', error.message);
  }
}

// Run test
testSubmissionEndpointsWithAuth().catch(console.error);
