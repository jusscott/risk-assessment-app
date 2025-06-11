#!/usr/bin/env node

const axios = require('axios');

async function diagnoseFrontendAPIHandling() {
  console.log('🔍 Diagnosing Frontend API Response Handling Issue\n');

  // Test the exact same request that the frontend would make
  try {
    // First get a token
    console.log('1. Getting authentication token...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'good@test.com',
      password: 'Password123'
    });

    if (!loginResponse.data?.success || !loginResponse.data?.data?.tokens?.accessToken) {
      throw new Error('Failed to get authentication token');
    }

    const token = loginResponse.data.data.tokens.accessToken;
    console.log('✅ Token acquired successfully');

    // Test API Gateway endpoint (what frontend uses)
    console.log('\n2. Testing API Gateway PUT request (frontend path)...');
    
    const testPayload = {
      answers: [
        {
          questionId: 1,
          submissionId: 1,
          value: "Test answer for diagnosis"
        }
      ]
    };

    const response = await axios.put('http://localhost:5000/api/questionnaires/submissions/1', testPayload, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('📡 RESPONSE ANALYSIS:');
    console.log(`   Status: ${response.status}`);
    console.log(`   Status Text: ${response.statusText}`);
    console.log(`   Headers:`, response.headers);
    console.log(`   Data:`, JSON.stringify(response.data, null, 2));

    // Analyze what the frontend API service would do with this response
    console.log('\n🔍 FRONTEND API SERVICE ANALYSIS:');
    console.log('The frontend API service has this logic for questionnaire endpoints:');
    console.log('');
    console.log('```javascript');
    console.log('// Handle other errors for questionnaire endpoints (including save progress)');
    console.log('if ((config?.url?.includes(\'/questionnaires\') || config?.url?.includes(\'/submissions\')) && response?.status !== 401) {');
    console.log('  // This treats ALL non-401 responses as errors!');
    console.log('  return Promise.reject({');
    console.log('    status: response?.status || 500,');
    console.log('    message: errorMessage,');
    console.log('    data: response?.data || {},');
    console.log('    isQuestionnaireEndpoint: true');
    console.log('  });');
    console.log('}');
    console.log('```');
    console.log('');

    if (response.status === 200) {
      console.log('🚨 PROBLEM IDENTIFIED:');
      console.log('   - Backend returns: 200 OK (Success)');
      console.log('   - Frontend API service: Treats this as ERROR because status !== 401');
      console.log('   - Result: User sees "Failed to save progress" even though it succeeded');
      console.log('');
      console.log('💡 THE FIX: The frontend API service should only reject on actual error status codes (4xx, 5xx),');
      console.log('   not on success codes (2xx). The condition should be:');
      console.log('   if (response?.status >= 400 && response?.status !== 401)');
      console.log('   instead of:');
      console.log('   if (response?.status !== 401)');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.response) {
      console.log('📡 ERROR RESPONSE:');
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Data:`, error.response.data);
    }
  }
}

diagnoseFrontendAPIHandling().catch(console.error);
