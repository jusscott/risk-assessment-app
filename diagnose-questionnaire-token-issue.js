#!/usr/bin/env node

const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:5000';
const TEST_CREDENTIALS = {
  email: 'good@test.com',
  password: 'Password123'
};

// Utility to simulate browser localStorage behavior
class MockLocalStorage {
  constructor() {
    this.storage = {};
  }

  setItem(key, value) {
    this.storage[key] = value;
    console.log(`📝 localStorage.setItem('${key}', '${value ? value.substring(0, 20) + '...' : value}')`);
  }

  getItem(key) {
    const value = this.storage[key] || null;
    console.log(`🔍 localStorage.getItem('${key}') -> ${value ? value.substring(0, 20) + '...' : 'null'}`);
    return value;
  }

  removeItem(key) {
    delete this.storage[key];
    console.log(`🗑️ localStorage.removeItem('${key}')`);
  }

  clear() {
    this.storage = {};
    console.log('🧹 localStorage.clear()');
  }
}

const mockLocalStorage = new MockLocalStorage();

// Simulate the auth-tokens utility behavior
function simulateAuthTokensFlow(loginResponse) {
  console.log('\n=== SIMULATING AUTH-TOKENS FLOW ===');
  
  if (loginResponse.data?.data?.tokens) {
    const { accessToken, refreshToken } = loginResponse.data.data.tokens;
    
    console.log('✅ Login response contains tokens:', {
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
      accessTokenLength: accessToken?.length || 0,
      refreshTokenLength: refreshToken?.length || 0
    });
    
    // Simulate storeTokens function
    console.log('\n--- Simulating storeTokens() ---');
    mockLocalStorage.setItem('token', accessToken);
    mockLocalStorage.setItem('refreshToken', refreshToken);
    
    // Simulate immediate retrieval (what should happen in questionnaire)
    console.log('\n--- Simulating immediate token retrieval ---');
    const retrievedToken = mockLocalStorage.getItem('token');
    const retrievedRefreshToken = mockLocalStorage.getItem('refreshToken');
    
    console.log('🔄 Token retrieval results:', {
      originalToken: !!accessToken,
      retrievedToken: !!retrievedToken,
      tokensMatch: accessToken === retrievedToken,
      originalRefreshToken: !!refreshToken,
      retrievedRefreshToken: !!retrievedRefreshToken,
      refreshTokensMatch: refreshToken === retrievedRefreshToken
    });
    
    return {
      accessToken: retrievedToken,
      refreshToken: retrievedRefreshToken,
      success: !!retrievedToken
    };
  } else {
    console.log('❌ Login response missing tokens structure');
    return { success: false };
  }
}

// Test complete authentication flow
async function testCompleteAuthFlow() {
  console.log('🚀 STARTING COMPLETE AUTHENTICATION FLOW DIAGNOSIS');
  console.log('================================================\n');
  
  try {
    // Step 1: Test login
    console.log('STEP 1: Testing login...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, TEST_CREDENTIALS, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });
    
    console.log('✅ Login successful!');
    console.log('Login response structure:', {
      success: loginResponse.data?.success,
      hasData: !!loginResponse.data?.data,
      hasUser: !!loginResponse.data?.data?.user,
      hasTokens: !!loginResponse.data?.data?.tokens,
      userEmail: loginResponse.data?.data?.user?.email,
      tokenKeys: loginResponse.data?.data?.tokens ? Object.keys(loginResponse.data.data.tokens) : []
    });
    
    // Step 2: Simulate token storage
    console.log('\nSTEP 2: Simulating token storage...');
    const tokenFlow = simulateAuthTokensFlow(loginResponse);
    
    if (!tokenFlow.success) {
      console.log('❌ Token storage simulation failed');
      return;
    }
    
    // Step 3: Test questionnaire endpoints with token
    console.log('\nSTEP 3: Testing questionnaire endpoints with stored token...');
    
    const testEndpoints = [
      '/api/questionnaires/templates',
      '/api/questionnaires/completed-submissions'
    ];
    
    for (const endpoint of testEndpoints) {
      console.log(`\n--- Testing ${endpoint} ---`);
      
      // Simulate what the frontend API service does
      console.log('🔍 Simulating frontend token retrieval...');
      const tokenForRequest = mockLocalStorage.getItem('token');
      
      if (!tokenForRequest) {
        console.log('❌ No token available for request');
        continue;
      }
      
      console.log('✅ Token retrieved for request:', {
        hasToken: !!tokenForRequest,
        tokenLength: tokenForRequest.length,
        tokenStart: tokenForRequest.substring(0, 20) + '...'
      });
      
      try {
        const questionnaireResponse = await axios.get(`${BASE_URL}${endpoint}`, {
          headers: {
            'Authorization': `Bearer ${tokenForRequest}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        });
        
        console.log('✅ Questionnaire request successful:', {
          status: questionnaireResponse.status,
          hasData: !!questionnaireResponse.data,
          endpoint: endpoint
        });
      } catch (error) {
        console.log('❌ Questionnaire request failed:', {
          status: error.response?.status,
          message: error.response?.data?.message || error.message,
          endpoint: endpoint,
          hasAuthHeader: !!error.config?.headers?.Authorization
        });
        
        // Check if it's specifically a token issue
        if (error.response?.status === 401) {
          console.log('🔍 401 Error Details:', {
            responseData: error.response.data,
            wasTokenSent: !!error.config?.headers?.Authorization,
            sentToken: error.config?.headers?.Authorization ? 
              error.config.headers.Authorization.substring(0, 27) + '...' : 'none'
          });
        }
      }
    }
    
    // Step 4: Test /auth/me endpoint to verify token is valid
    console.log('\nSTEP 4: Testing /auth/me endpoint to verify token validity...');
    const tokenForMe = mockLocalStorage.getItem('token');
    
    if (tokenForMe) {
      try {
        const meResponse = await axios.get(`${BASE_URL}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${tokenForMe}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        });
        
        console.log('✅ /auth/me successful:', {
          status: meResponse.status,
          userEmail: meResponse.data?.data?.email,
          userId: meResponse.data?.data?.id
        });
      } catch (error) {
        console.log('❌ /auth/me failed:', {
          status: error.response?.status,
          message: error.response?.data?.message || error.message
        });
        
        // This indicates the token itself might be invalid
        if (error.response?.status === 401) {
          console.log('🚨 TOKEN VALIDATION FAILED - This suggests the token from login is invalid');
        }
      }
    }
    
    // Step 5: Browser state simulation
    console.log('\nSTEP 5: Simulating browser state changes...');
    
    // Simulate page navigation/refresh
    console.log('--- Simulating page navigation ---');
    const tokenAfterNavigation = mockLocalStorage.getItem('token');
    console.log('Token persistence after navigation:', {
      stillExists: !!tokenAfterNavigation,
      sameAsOriginal: tokenAfterNavigation === tokenFlow.accessToken
    });
    
    // Simulate potential token clearing scenarios
    console.log('\n--- Testing potential token clearing scenarios ---');
    
    // Check if token expires immediately
    if (tokenFlow.accessToken) {
      try {
        const jwtPayload = JSON.parse(Buffer.from(tokenFlow.accessToken.split('.')[1], 'base64').toString());
        const now = Math.floor(Date.now() / 1000);
        const timeUntilExpiry = jwtPayload.exp - now;
        
        console.log('Token expiry analysis:', {
          currentTime: now,
          tokenExpiry: jwtPayload.exp,
          timeUntilExpiry: timeUntilExpiry,
          expiredAlready: timeUntilExpiry <= 0,
          expiresWithinMinute: timeUntilExpiry <= 60
        });
      } catch (error) {
        console.log('❌ Could not decode token payload:', error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Authentication flow test failed:', {
      message: error.message,
      status: error.response?.status,
      responseData: error.response?.data
    });
  }
}

// Additional test: Check for timing issues
async function testTimingIssues() {
  console.log('\n=== TESTING TIMING ISSUES ===');
  
  try {
    // Login
    console.log('Logging in...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, TEST_CREDENTIALS);
    
    if (loginResponse.data?.data?.tokens?.accessToken) {
      const token = loginResponse.data.data.tokens.accessToken;
      mockLocalStorage.setItem('token', token);
      
      // Test immediate access vs delayed access
      console.log('\n--- Testing immediate vs delayed token access ---');
      
      // Immediate access (0ms delay)
      const immediateToken = mockLocalStorage.getItem('token');
      console.log('Immediate access result:', !!immediateToken);
      
      // Slightly delayed access (100ms delay)
      setTimeout(() => {
        const delayedToken = mockLocalStorage.getItem('token');
        console.log('Delayed access result (100ms):', !!delayedToken);
      }, 100);
      
      // More delayed access (1000ms delay)
      setTimeout(() => {
        const veryDelayedToken = mockLocalStorage.getItem('token');
        console.log('Very delayed access result (1000ms):', !!veryDelayedToken);
      }, 1000);
    }
    
  } catch (error) {
    console.error('❌ Timing test failed:', error.message);
  }
}

// Run all tests
async function runAllTests() {
  await testCompleteAuthFlow();
  console.log('\n' + '='.repeat(60) + '\n');
  await testTimingIssues();
  
  console.log('\n🏁 DIAGNOSIS COMPLETE');
  console.log('If the issue persists, the problem is likely in:');
  console.log('1. Token being cleared by another part of the frontend');
  console.log('2. Race condition in token storage/retrieval');
  console.log('3. Browser-specific localStorage issues');
  console.log('4. React state management conflicts');
}

// Execute the tests
runAllTests().catch(console.error);
