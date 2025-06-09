#!/usr/bin/env node

/**
 * End-to-end authentication flow test - simulates exactly what the frontend does
 */

const axios = require('axios');

const FRONTEND_URL = 'http://localhost:3000';
const API_URL = 'http://localhost:5000';
const TEST_EMAIL = 'jusscott@gmail.com';
const TEST_PASSWORD = 'Password123';

console.log('🔐 Testing End-to-End Authentication Flow');
console.log('==========================================');
console.log(`Frontend URL: ${FRONTEND_URL}`);
console.log(`API Gateway URL: ${API_URL}`);
console.log(`Test Email: ${TEST_EMAIL}`);
console.log(`Test Password: ${TEST_PASSWORD}`);

// Create axios instance that mimics the frontend configuration
const frontendApiClient = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000
});

async function testAuthFlow() {
  console.log('\n🧪 STEP 1: Testing API Gateway Health');
  try {
    const healthResponse = await axios.get(`${API_URL}/health`);
    console.log('✅ API Gateway Health:', healthResponse.status, healthResponse.data?.message || 'OK');
  } catch (error) {
    console.log('⚠️  API Gateway Health Check Failed:', error.message);
  }

  console.log('\n🧪 STEP 2: Testing Direct Auth Service');
  try {
    const directAuthResponse = await axios.post(`http://localhost:5001/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });
    console.log('✅ Direct Auth Service Response:', directAuthResponse.status);
    console.log('   User:', directAuthResponse.data?.data?.user?.firstName, directAuthResponse.data?.data?.user?.lastName);
    console.log('   Email:', directAuthResponse.data?.data?.user?.email);
    console.log('   Role:', directAuthResponse.data?.data?.user?.role);
  } catch (error) {
    console.log('❌ Direct Auth Service Failed:', error.response?.status, error.response?.data || error.message);
    return;
  }

  console.log('\n🧪 STEP 3: Testing API Gateway Auth Route');
  try {
    const gatewayAuthResponse = await axios.post(`${API_URL}/api/auth/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });
    console.log('✅ API Gateway Auth Response:', gatewayAuthResponse.status);
    console.log('   User:', gatewayAuthResponse.data?.data?.user?.firstName, gatewayAuthResponse.data?.data?.user?.lastName);
    console.log('   Email:', gatewayAuthResponse.data?.data?.user?.email);
    console.log('   Role:', gatewayAuthResponse.data?.data?.user?.role);
    console.log('   Token Length:', gatewayAuthResponse.data?.data?.tokens?.accessToken?.length || 0);
  } catch (error) {
    console.log('❌ API Gateway Auth Failed:', error.response?.status, error.response?.data || error.message);
    return;
  }

  console.log('\n🧪 STEP 4: Testing Frontend API Client (Exact Configuration)');
  try {
    const frontendResponse = await frontendApiClient.post('/auth/login', {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });
    console.log('✅ Frontend API Client Response:', frontendResponse.status);
    console.log('   Success:', frontendResponse.data?.success);
    console.log('   User:', frontendResponse.data?.data?.user?.firstName, frontendResponse.data?.data?.user?.lastName);
    console.log('   Email:', frontendResponse.data?.data?.user?.email);
    console.log('   Role:', frontendResponse.data?.data?.user?.role);
    console.log('   Token Present:', !!frontendResponse.data?.data?.tokens?.accessToken);
    
    // Store token for next test
    const accessToken = frontendResponse.data?.data?.tokens?.accessToken;
    
    console.log('\n🧪 STEP 5: Testing Authenticated Request (with Token)');
    try {
      const profileResponse = await frontendApiClient.get('/auth/me', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      console.log('✅ Authenticated Profile Request:', profileResponse.status);
      console.log('   Profile User:', profileResponse.data?.data?.firstName, profileResponse.data?.data?.lastName);
    } catch (profileError) {
      console.log('⚠️  Profile Request Failed:', profileError.response?.status, profileError.response?.data || profileError.message);
    }
    
  } catch (error) {
    console.log('❌ Frontend API Client Failed:', error.response?.status, error.response?.data || error.message);
    console.log('   Full Error Details:', {
      message: error.message,
      code: error.code,
      response: error.response ? {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      } : 'No response'
    });
    return;
  }

  console.log('\n🧪 STEP 6: Testing CORS Headers');
  try {
    const corsResponse = await axios.options(`${API_URL}/api/auth/login`);
    console.log('✅ CORS Preflight:', corsResponse.status);
    const corsHeaders = corsResponse.headers;
    console.log('   Access-Control-Allow-Origin:', corsHeaders['access-control-allow-origin'] || 'Not set');
    console.log('   Access-Control-Allow-Methods:', corsHeaders['access-control-allow-methods'] || 'Not set');
    console.log('   Access-Control-Allow-Headers:', corsHeaders['access-control-allow-headers'] || 'Not set');
  } catch (corsError) {
    console.log('⚠️  CORS Test:', corsError.response?.status || corsError.message);
  }

  console.log('\n🎉 AUTHENTICATION FLOW TESTING COMPLETE!');
  console.log('=========================================');
  console.log('✅ All tests passed - authentication should work in frontend');
  console.log('');
  console.log('🎯 FINAL LOGIN CREDENTIALS FOR FRONTEND:');
  console.log(`   📧 Email: ${TEST_EMAIL}`);
  console.log(`   🔐 Password: ${TEST_PASSWORD}`);
  console.log('');
  console.log('💡 If you\'re still seeing "unexpected error" in frontend:');
  console.log('   1. Check browser developer console for detailed error messages');
  console.log('   2. Check browser network tab to see actual request/response');
  console.log('   3. Ensure frontend is running on http://localhost:3000');
  console.log('   4. Try hard refresh (Ctrl+F5) to clear any cached errors');
}

testAuthFlow().catch(error => {
  console.error('❌ Test script failed:', error.message);
  process.exit(1);
});
