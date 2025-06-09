const axios = require('axios');

/**
 * Critical Login Issue Diagnostic
 * Tests the complete login flow to identify the specific failure point
 */

console.log('🔍 CRITICAL LOGIN ISSUE DIAGNOSTIC');
console.log('==================================');
console.log('Testing login functionality after auth service 404 fix...\n');

const BASE_URL = 'http://localhost:5000';
const API_GATEWAY_URL = `${BASE_URL}/api`;
const AUTH_SERVICE_URL = 'http://localhost:5001';
const FRONTEND_URL = 'http://localhost:3000';

// Test user from the issue report
const TEST_USER = {
  email: 'jusscott@gmail.com',
  password: 'testPassword123!' // You may need to adjust this
};

async function testServiceHealth() {
  console.log('1️⃣ Testing Service Health...');
  
  try {
    // Test API Gateway
    console.log('   🔗 Testing API Gateway...');
    const gatewayResponse = await axios.get(`${BASE_URL}/health`, { timeout: 5000 });
    console.log(`   ✅ API Gateway: ${gatewayResponse.status} - ${gatewayResponse.data?.message || 'OK'}`);
  } catch (error) {
    console.log(`   ❌ API Gateway: ${error.message}`);
    return false;
  }

  try {
    // Test Auth Service directly
    console.log('   🔐 Testing Auth Service directly...');
    const authResponse = await axios.get(`${AUTH_SERVICE_URL}/health`, { timeout: 5000 });
    console.log(`   ✅ Auth Service Direct: ${authResponse.status} - ${authResponse.data?.message || 'OK'}`);
  } catch (error) {
    console.log(`   ❌ Auth Service Direct: ${error.message}`);
  }

  try {
    // Test Auth Service through API Gateway
    console.log('   🌐 Testing Auth Service through API Gateway...');
    const gatewayAuthResponse = await axios.get(`${API_GATEWAY_URL}/auth/health`, { timeout: 5000 });
    console.log(`   ✅ Auth Service via Gateway: ${gatewayAuthResponse.status} - ${gatewayAuthResponse.data?.message || 'OK'}`);
  } catch (error) {
    console.log(`   ❌ Auth Service via Gateway: ${error.message}`);
    if (error.response) {
      console.log(`   📄 Response Status: ${error.response.status}`);
      console.log(`   📄 Response Data:`, error.response.data);
    }
  }

  return true;
}

async function testUserExists() {
  console.log('\n2️⃣ Testing User Database Status...');
  
  try {
    // We can't directly test user existence without exposing sensitive endpoints
    // But we can check if the auth service can handle database queries
    console.log('   📊 Testing database connectivity through auth service...');
    
    // Try a login with an obviously fake user to see database connectivity
    const fakeLoginResponse = await axios.post(
      `${AUTH_SERVICE_URL}/api/auth/login`,
      {
        email: 'nonexistent@test.com',
        password: 'fake'
      },
      { 
        timeout: 10000,
        validateStatus: () => true // Accept all status codes
      }
    );
    
    console.log(`   📊 Database connectivity test status: ${fakeLoginResponse.status}`);
    
    if (fakeLoginResponse.status === 401) {
      console.log('   ✅ Database is accessible (returned proper 401 for invalid user)');
      return true;
    } else if (fakeLoginResponse.status === 500) {
      console.log('   ❌ Database connection issue (500 error)');
      console.log('   📄 Error details:', fakeLoginResponse.data);
      return false;
    } else {
      console.log('   ⚠️  Unexpected response:', fakeLoginResponse.data);
      return true; // Continue anyway
    }
    
  } catch (error) {
    console.log(`   ❌ Database connectivity test failed: ${error.message}`);
    return false;
  }
}

async function testDirectAuthServiceLogin() {
  console.log('\n3️⃣ Testing Direct Auth Service Login...');
  
  try {
    console.log(`   🔐 Attempting direct auth service login for: ${TEST_USER.email}`);
    
    const loginResponse = await axios.post(
      `${AUTH_SERVICE_URL}/api/auth/login`,
      TEST_USER,
      { 
        timeout: 15000,
        validateStatus: () => true // Accept all status codes
      }
    );
    
    console.log(`   📊 Login response status: ${loginResponse.status}`);
    console.log(`   📄 Login response data:`, JSON.stringify(loginResponse.data, null, 2));
    
    if (loginResponse.status === 200) {
      console.log('   ✅ Direct auth service login successful!');
      return loginResponse.data;
    } else if (loginResponse.status === 401) {
      console.log('   ⚠️  Authentication failed - check credentials or user existence');
      return null;
    } else {
      console.log('   ❌ Unexpected error during direct auth service login');
      return null;
    }
    
  } catch (error) {
    console.log(`   ❌ Direct auth service login failed: ${error.message}`);
    if (error.response) {
      console.log(`   📄 Error response status: ${error.response.status}`);
      console.log(`   📄 Error response data:`, error.response.data);
    }
    return null;
  }
}

async function testAPIGatewayLogin() {
  console.log('\n4️⃣ Testing API Gateway Login (Frontend Path)...');
  
  try {
    console.log(`   🌐 Attempting API Gateway login for: ${TEST_USER.email}`);
    
    const loginResponse = await axios.post(
      `${API_GATEWAY_URL}/auth/login`,
      TEST_USER,
      { 
        timeout: 15000,
        validateStatus: () => true, // Accept all status codes
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );
    
    console.log(`   📊 API Gateway login response status: ${loginResponse.status}`);
    console.log(`   📄 API Gateway login response data:`, JSON.stringify(loginResponse.data, null, 2));
    
    if (loginResponse.status === 200) {
      console.log('   ✅ API Gateway login successful!');
      return loginResponse.data;
    } else if (loginResponse.status === 401) {
      console.log('   ⚠️  Authentication failed through API Gateway - check credentials');
      return null;
    } else if (loginResponse.status === 404) {
      console.log('   ❌ API Gateway routing issue - auth endpoint not found');
      return null;
    } else if (loginResponse.status === 429) {
      console.log('   ⚠️  Rate limiting triggered');
      return null;
    } else if (loginResponse.status >= 500) {
      console.log('   ❌ Server error through API Gateway');
      return null;
    } else {
      console.log('   ❌ Unexpected response from API Gateway');
      return null;
    }
    
  } catch (error) {
    console.log(`   ❌ API Gateway login failed: ${error.message}`);
    if (error.response) {
      console.log(`   📄 Error response status: ${error.response.status}`);
      console.log(`   📄 Error response data:`, error.response.data);
    }
    if (error.code === 'ECONNREFUSED') {
      console.log('   🔌 Connection refused - check if API Gateway is running on port 3000');
    } else if (error.code === 'TIMEOUT') {
      console.log('   ⏱️  Request timeout - service may be overloaded or hanging');
    }
    return null;
  }
}

async function testRateLimitingStatus() {
  console.log('\n5️⃣ Testing Rate Limiting Status...');
  
  try {
    console.log('   🚦 Checking rate limiting configuration...');
    
    // Test a few rapid requests to see rate limiting behavior
    const requests = [];
    for (let i = 0; i < 3; i++) {
      requests.push(
        axios.get(`${API_GATEWAY_URL}/auth/health`, { 
          timeout: 5000,
          validateStatus: () => true 
        })
      );
    }
    
    const responses = await Promise.all(requests);
    const rateLimited = responses.some(r => r.status === 429);
    
    if (rateLimited) {
      console.log('   ⚠️  Rate limiting is active and may be blocking requests');
    } else {
      console.log('   ✅ Rate limiting appears to be working normally');
    }
    
  } catch (error) {
    console.log(`   ❌ Rate limiting test failed: ${error.message}`);
  }
}

async function runDiagnostic() {
  const startTime = Date.now();
  
  try {
    // Run all diagnostic steps
    const healthy = await testServiceHealth();
    if (!healthy) {
      console.log('\n❌ CRITICAL: Basic service health checks failed');
      console.log('Please ensure all services are running:');
      console.log('- API Gateway on port 3000');
      console.log('- Auth Service on port 3001');
      return;
    }
    
    const dbHealthy = await testUserExists();
    if (!dbHealthy) {
      console.log('\n❌ CRITICAL: Database connectivity issues detected');
      return;
    }
    
    const directAuthResult = await testDirectAuthServiceLogin();
    const gatewayAuthResult = await testAPIGatewayLogin();
    
    await testRateLimitingStatus();
    
    // Summary
    console.log('\n📋 DIAGNOSTIC SUMMARY');
    console.log('=====================');
    
    if (directAuthResult && gatewayAuthResult) {
      console.log('✅ Login works both directly and through API Gateway');
      console.log('🤔 Issue may be frontend-specific or intermittent');
    } else if (directAuthResult && !gatewayAuthResult) {
      console.log('❌ ISSUE IDENTIFIED: API Gateway login broken, but direct auth works');
      console.log('🔧 Check API Gateway routing and middleware configuration');
    } else if (!directAuthResult && !gatewayAuthResult) {
      console.log('❌ CRITICAL ISSUE: Authentication completely broken');
      console.log('🔧 Check auth service, database, and user credentials');
    } else if (!directAuthResult && gatewayAuthResult) {
      console.log('⚠️  UNUSUAL: Gateway works but direct auth fails');
      console.log('🔧 Check auth service configuration and database');
    }
    
    console.log(`\n⏱️  Diagnostic completed in ${Date.now() - startTime}ms`);
    
  } catch (error) {
    console.log(`\n❌ DIAGNOSTIC FAILED: ${error.message}`);
  }
}

// Run the diagnostic
runDiagnostic().catch(console.error);
