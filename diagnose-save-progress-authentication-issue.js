#!/usr/bin/env node

const axios = require('axios');

console.log('🔍 Diagnosing Save Progress Authentication Issue...\n');

async function testEndpoint(description, method, url, headers = {}, data = null) {
  console.log(`\n📍 Testing: ${description}`);
  console.log(`   ${method.toUpperCase()} ${url}`);
  
  try {
    const config = { method, url, headers };
    if (data) config.data = data;
    
    const response = await axios(config);
    console.log(`   ✅ Status: ${response.status}`);
    if (response.data) {
      console.log(`   📄 Response: ${JSON.stringify(response.data).substring(0, 200)}...`);
    }
    return { success: true, status: response.status, data: response.data };
  } catch (error) {
    const status = error.response?.status || 'NO_RESPONSE';
    console.log(`   ❌ Status: ${status}`);
    if (error.response?.data) {
      console.log(`   📄 Error: ${JSON.stringify(error.response.data)}`);
    } else {
      console.log(`   📄 Error: ${error.message}`);
    }
    return { success: false, status, error: error.response?.data || error.message };
  }
}

async function getValidAuthToken() {
  console.log('\n🔐 Getting valid authentication token...');
  
  try {
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'good@test.com',
      password: 'Password123'
    });
    
    const token = loginResponse.data?.tokens?.accessToken;
    if (token) {
      console.log('   ✅ Successfully obtained auth token');
      return token;
    } else {
      console.log('   ❌ No token in login response');
      return null;
    }
  } catch (error) {
    console.log(`   ❌ Login failed: ${error.message}`);
    return null;
  }
}

async function runDiagnostics() {
  console.log('='.repeat(60));
  console.log('🏥 QUESTIONNAIRE SERVICE SAVE PROGRESS DIAGNOSTICS');
  console.log('='.repeat(60));

  // 1. Test service health
  await testEndpoint(
    'Questionnaire Service Health Check',
    'get',
    'http://localhost:5002/health'
  );

  // 2. Test API Gateway routing
  await testEndpoint(
    'API Gateway to Questionnaire Service',
    'get',
    'http://localhost:5000/api/questionnaires/submissions/in-progress'
  );

  // 3. Get auth token
  const authToken = await getValidAuthToken();
  
  if (authToken) {
    const authHeaders = {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    };

    // 4. Test authenticated GET request
    await testEndpoint(
      'Authenticated GET via API Gateway',
      'get',
      'http://localhost:5000/api/questionnaires/submissions/in-progress',
      authHeaders
    );

    // 5. Test direct authenticated PUT to service
    await testEndpoint(
      'Direct PUT to Questionnaire Service (with auth)',
      'put',
      'http://localhost:5002/api/submissions/6',
      authHeaders,
      { answers: { "1": "test answer" } }
    );

    // 6. Test PUT via API Gateway
    await testEndpoint(
      'PUT via API Gateway (with auth)',
      'put',
      'http://localhost:5000/api/questionnaires/submissions/6',
      authHeaders,
      { answers: { "1": "test answer" } }
    );

    // 7. Check if submission 6 exists
    await testEndpoint(
      'Check if submission 6 exists',
      'get',
      'http://localhost:5000/api/questionnaires/submissions/6',
      authHeaders
    );

  } else {
    console.log('\n❌ Cannot test authenticated requests - no valid token available');
  }

  // 8. Test without authentication (should get 403)
  await testEndpoint(
    'PUT without authentication (should get 403)',
    'put',
    'http://localhost:5000/api/questionnaires/submissions/6',
    { 'Content-Type': 'application/json' },
    { answers: { "1": "test answer" } }
  );

  console.log('\n' + '='.repeat(60));
  console.log('📋 SUMMARY');
  console.log('='.repeat(60));
  console.log('🔍 The 502 error likely occurred when the service was starting up.');
  console.log('🔒 Current issue is authentication - requests need proper Bearer tokens.');
  console.log('🔄 Frontend needs to ensure auth headers are properly forwarded.');
  console.log('📝 Check browser dev tools for auth token in localStorage.');
  
  console.log('\n💡 NEXT STEPS:');
  console.log('1. Verify the frontend is sending Authorization headers');
  console.log('2. Check if the API Gateway is properly forwarding auth headers');
  console.log('3. Ensure the questionnaire service auth middleware is working correctly');
}

runDiagnostics().catch(console.error);
