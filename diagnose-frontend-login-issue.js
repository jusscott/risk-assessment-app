#!/usr/bin/env node

/**
 * Diagnose Frontend Login Issue - Deep dive into browser-specific problems
 */

const axios = require('axios');
const fs = require('fs');

const FRONTEND_URL = 'http://localhost:3000';
const API_URL = 'http://localhost:5000';
const TEST_EMAIL = 'jusscott@gmail.com';
const TEST_PASSWORD = 'Password123';

console.log('🔍 DIAGNOSING FRONTEND LOGIN ISSUE');
console.log('=====================================');
console.log(`Frontend URL: ${FRONTEND_URL}`);
console.log(`API Gateway URL: ${API_URL}`);
console.log(`Test Credentials: ${TEST_EMAIL} / ${TEST_PASSWORD}`);

async function diagnoseFrontendIssue() {
  console.log('\n🧪 STEP 1: Testing Frontend Availability');
  try {
    const frontendResponse = await axios.get(FRONTEND_URL, { timeout: 5000 });
    console.log('✅ Frontend Status:', frontendResponse.status);
    console.log('   Frontend serving React app correctly');
  } catch (error) {
    console.log('❌ Frontend Error:', error.code || error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('   🚨 FRONTEND NOT RUNNING! Start with: npm start');
      return;
    }
  }

  console.log('\n🧪 STEP 2: Testing Exact Frontend API Configuration');
  
  // Mimic the exact frontend API setup
  const frontendApiClient = axios.create({
    baseURL: `${API_URL}/api`,
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: 10000
  });

  try {
    const response = await frontendApiClient.post('/auth/login', {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });
    
    console.log('✅ Frontend API Client Success:', response.status);
    console.log('   Response structure:', {
      success: response.data?.success,
      hasUser: !!response.data?.data?.user,
      hasTokens: !!response.data?.data?.tokens,
      userEmail: response.data?.data?.user?.email,
      firstName: response.data?.data?.user?.firstName,
      role: response.data?.data?.user?.role
    });
    
  } catch (error) {
    console.log('❌ Frontend API Client Error:', error.response?.status || error.code);
    console.log('   Error Details:', error.response?.data || error.message);
    
    if (error.response?.status === 422) {
      console.log('   🚨 VALIDATION ERROR - Check request format');
    } else if (error.response?.status === 401) {
      console.log('   🚨 AUTHENTICATION ERROR - Check credentials');
    } else if (error.response?.status >= 500) {
      console.log('   🚨 SERVER ERROR - Check backend logs');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('   🚨 CONNECTION REFUSED - API Gateway down');
    }
  }

  console.log('\n🧪 STEP 3: Testing Rate Limiting Issues');
  try {
    // Test multiple rapid requests to see if rate limiting is blocking
    const rapidRequests = [];
    for (let i = 0; i < 3; i++) {
      rapidRequests.push(
        frontendApiClient.post('/auth/login', {
          email: TEST_EMAIL,
          password: TEST_PASSWORD
        }).catch(err => ({ error: err.response?.status || err.code }))
      );
    }
    
    const results = await Promise.all(rapidRequests);
    console.log('✅ Rate Limiting Test Results:');
    results.forEach((result, index) => {
      if (result.error) {
        console.log(`   Request ${index + 1}: ERROR ${result.error}`);
        if (result.error === 429) {
          console.log('   🚨 RATE LIMITED! This might be the issue');
        }
      } else {
        console.log(`   Request ${index + 1}: SUCCESS ${result.status || 200}`);
      }
    });
    
  } catch (error) {
    console.log('⚠️  Rate limiting test failed:', error.message);
  }

  console.log('\n🧪 STEP 4: Testing Browser-Specific Headers');
  try {
    const browserHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/plain, */*',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Origin': FRONTEND_URL,
      'Referer': `${FRONTEND_URL}/login`,
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Cache-Control': 'no-cache',
    };

    const browserResponse = await axios.post(`${API_URL}/api/auth/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    }, {
      headers: browserHeaders,
      timeout: 10000
    });

    console.log('✅ Browser Headers Test:', browserResponse.status);
    console.log('   Browser-like request successful');
    
  } catch (error) {
    console.log('❌ Browser Headers Test Failed:', error.response?.status || error.code);
    console.log('   Error:', error.response?.data?.message || error.message);
  }

  console.log('\n🧪 STEP 5: Testing CORS Preflight');
  try {
    const preflightResponse = await axios.options(`${API_URL}/api/auth/login`, {
      headers: {
        'Origin': FRONTEND_URL,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    });
    
    console.log('✅ CORS Preflight:', preflightResponse.status);
    const corsHeaders = preflightResponse.headers;
    console.log('   CORS Headers:', {
      'Access-Control-Allow-Origin': corsHeaders['access-control-allow-origin'],
      'Access-Control-Allow-Methods': corsHeaders['access-control-allow-methods'],
      'Access-Control-Allow-Headers': corsHeaders['access-control-allow-headers']
    });
    
  } catch (error) {
    console.log('❌ CORS Preflight Failed:', error.response?.status || error.message);
    if (error.response?.status === 404) {
      console.log('   🚨 CORS OPTIONS endpoint not found');
    }
  }

  console.log('\n🧪 STEP 6: Testing API Gateway Health & Routes');
  try {
    const healthResponse = await axios.get(`${API_URL}/health`);
    console.log('✅ API Gateway Health:', healthResponse.status);
    
    // Test if the route exists
    const routeTestResponse = await axios.get(`${API_URL}/api/auth`, {
      validateStatus: () => true // Accept any status
    });
    console.log('   Auth Route Test:', routeTestResponse.status);
    
    if (routeTestResponse.status === 404) {
      console.log('   🚨 AUTH ROUTES NOT MOUNTED PROPERLY');
    }
    
  } catch (error) {
    console.log('❌ API Gateway Issues:', error.message);
  }

  console.log('\n🧪 STEP 7: Testing Frontend Environment Variables');
  
  // Check if there's a way to detect the frontend's API URL configuration
  try {
    const frontendAssets = await axios.get(`${FRONTEND_URL}/static/js/`, {
      validateStatus: () => true
    }).catch(() => null);
    
    if (frontendAssets?.data) {
      console.log('✅ Frontend assets accessible');
      // Look for any obvious API URL configurations
      if (frontendAssets.data.includes('localhost:5000')) {
        console.log('   Frontend correctly configured for localhost:5000');
      } else if (frontendAssets.data.includes('localhost:3001')) {
        console.log('   🚨 Frontend may be configured for wrong API port (3001)');
      } else {
        console.log('   Frontend API configuration unclear from assets');
      }
    }
  } catch (error) {
    console.log('⚠️  Could not analyze frontend configuration');
  }

  console.log('\n🧪 STEP 8: Testing Authentication Validation');
  try {
    // Test with invalid credentials to see error handling
    const invalidResponse = await frontendApiClient.post('/auth/login', {
      email: 'invalid@test.com',
      password: 'wrongpassword'
    }).catch(err => ({
      status: err.response?.status,
      data: err.response?.data,
      message: err.message
    }));

    if (invalidResponse.status === 401) {
      console.log('✅ Invalid credentials properly rejected with 401');
      console.log('   This suggests the auth validation is working');
    } else {
      console.log('⚠️  Unexpected response for invalid credentials:', invalidResponse.status);
    }
    
  } catch (error) {
    console.log('⚠️  Could not test invalid credentials:', error.message);
  }

  console.log('\n🧪 STEP 9: Generate Browser Debug Commands');
  console.log('\n📋 BROWSER DEBUGGING COMMANDS:');
  console.log('=====================================');
  console.log('Open browser console (F12) and run these commands:');
  console.log('');
  console.log('1. Check API URL configuration:');
  console.log(`   console.log('API URL:', process.env.REACT_APP_API_URL || 'http://localhost:5000');`);
  console.log('');
  console.log('2. Test login directly in console:');
  console.log(`   fetch('${API_URL}/api/auth/login', {`);
  console.log(`     method: 'POST',`);
  console.log(`     headers: { 'Content-Type': 'application/json' },`);
  console.log(`     body: JSON.stringify({`);
  console.log(`       email: '${TEST_EMAIL}',`);
  console.log(`       password: '${TEST_PASSWORD}'`);
  console.log(`     })`);
  console.log(`   }).then(r => r.json()).then(console.log).catch(console.error);`);
  console.log('');
  console.log('3. Check network tab for the actual error details');
  console.log('4. Check console tab for any JavaScript errors');

  console.log('\n🎯 NEXT STEPS:');
  console.log('==============');
  console.log('1. Open http://localhost:3000/login in your browser');
  console.log('2. Open Developer Tools (F12)');
  console.log('3. Go to Network tab');
  console.log('4. Try to login with the credentials');
  console.log('5. Look at the failed request details');
  console.log('6. Check Console tab for JavaScript errors');
  console.log('7. Run the browser debug commands above');
  console.log('');
  console.log('If you see specific error messages, please share them for targeted fixes.');
}

diagnoseFrontendIssue().catch(error => {
  console.error('❌ Diagnostic script failed:', error.message);
  process.exit(1);
});
