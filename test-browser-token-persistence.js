#!/usr/bin/env node

const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:5000';
const TEST_CREDENTIALS = {
  email: 'good@test.com',
  password: 'Password123'
};

async function testTokenPersistence() {
  console.log('🧪 TESTING TOKEN PERSISTENCE ISSUE');
  console.log('=======================================\n');
  
  try {
    // Step 1: Simulate login and token storage
    console.log('STEP 1: Login and simulate token storage...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, TEST_CREDENTIALS);
    
    if (!loginResponse.data?.data?.tokens?.accessToken) {
      console.log('❌ Login failed or no tokens received');
      return;
    }
    
    const { accessToken, refreshToken } = loginResponse.data.data.tokens;
    console.log('✅ Login successful, tokens received');
    
    // Step 2: Test the auth-tokens pattern used in the frontend
    console.log('\nSTEP 2: Testing auth-tokens pattern...');
    
    // Simulate what happens in the frontend storeTokens function
    console.log('Simulating localStorage.setItem operations...');
    
    // Create a mock storage object
    const mockStorage = {};
    
    // Simulate storeTokens
    mockStorage['token'] = accessToken;
    mockStorage['refreshToken'] = refreshToken;
    const now = Date.now();
    mockStorage['lastTokenRefresh'] = now.toString();
    
    console.log('✅ Tokens stored in mock storage');
    
    // Step 3: Test immediate retrieval (what should work)
    console.log('\nSTEP 3: Testing immediate retrieval...');
    
    const immediateToken = mockStorage['token'];
    console.log('Immediate retrieval result:', {
      hasToken: !!immediateToken,
      tokenMatches: immediateToken === accessToken
    });
    
    // Step 4: Simulate the auth-tokens utility behavior
    console.log('\nSTEP 4: Simulating auth-tokens utility behavior...');
    
    // This simulates what happens in the getAccessToken function
    function simulateGetAccessToken() {
      // Always check localStorage first in case another tab updated it
      const token = mockStorage['token']; // This simulates localStorage.getItem('token')
      console.log('🔍 localStorage.getItem("token") returned:', token ? 'TOKEN_EXISTS' : 'null');
      return token;
    }
    
    const retrievedToken = simulateGetAccessToken();
    console.log('Token retrieval simulation result:', {
      hasToken: !!retrievedToken,
      tokenLength: retrievedToken?.length || 0
    });
    
    // Step 5: Test isAuthenticated behavior
    console.log('\nSTEP 5: Testing isAuthenticated logic...');
    
    function simulateIsAuthenticated(validateExpiry = true) {
      const token = simulateGetAccessToken();
      console.log('isAuthenticated - token check:', !!token);
      
      if (!token) return false;
      
      if (validateExpiry) {
        try {
          // Decode JWT without verification (like jwt-decode does)
          const base64Payload = token.split('.')[1];
          const payload = JSON.parse(Buffer.from(base64Payload, 'base64').toString());
          const now = Math.floor(Date.now() / 1000);
          const isExpired = payload.exp <= now;
          
          console.log('Token expiry check:', {
            currentTime: now,
            tokenExpiry: payload.exp,
            isExpired: isExpired,
            timeRemaining: payload.exp - now
          });
          
          return !isExpired;
        } catch (error) {
          console.log('❌ Error decoding token:', error.message);
          return false;
        }
      }
      
      return true;
    }
    
    const isAuthenticated = simulateIsAuthenticated();
    console.log('isAuthenticated result:', isAuthenticated);
    
    // Step 6: Test what happens with questionnaire requests
    console.log('\nSTEP 6: Testing questionnaire request with simulated token...');
    
    if (retrievedToken) {
      try {
        const questionnaireResponse = await axios.get(`${BASE_URL}/api/questionnaires/templates`, {
          headers: {
            'Authorization': `Bearer ${retrievedToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('✅ Questionnaire request successful:', {
          status: questionnaireResponse.status,
          hasData: !!questionnaireResponse.data
        });
      } catch (error) {
        console.log('❌ Questionnaire request failed:', {
          status: error.response?.status,
          message: error.response?.data?.message || error.message
        });
      }
    } else {
      console.log('❌ No token available for questionnaire request');
    }
    
    // Step 7: Test the specific pattern that might be failing
    console.log('\nSTEP 7: Testing potential failure patterns...');
    
    // Test clearing scenarios
    console.log('--- Testing token clearing scenarios ---');
    
    // Scenario A: Storage cleared by another process
    console.log('Scenario A: Storage cleared by another process');
    delete mockStorage['token'];
    const afterClearingToken = simulateGetAccessToken();
    console.log('Token after clearing:', !!afterClearingToken);
    
    // Restore token
    mockStorage['token'] = accessToken;
    
    // Scenario B: Token replaced with invalid value
    console.log('Scenario B: Token replaced with invalid value');
    mockStorage['token'] = 'invalid-token';
    const invalidToken = simulateGetAccessToken();
    console.log('Invalid token test:', {
      hasToken: !!invalidToken,
      isValid: invalidToken === accessToken
    });
    
    // Restore token
    mockStorage['token'] = accessToken;
    
    // Scenario C: Multiple rapid token checks
    console.log('Scenario C: Multiple rapid token checks');
    for (let i = 0; i < 5; i++) {
      const rapidToken = simulateGetAccessToken();
      console.log(`Rapid check ${i + 1}:`, !!rapidToken);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Additional test for race conditions
async function testRaceConditions() {
  console.log('\n🏃 TESTING RACE CONDITIONS');
  console.log('===========================\n');
  
  try {
    // Login first
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, TEST_CREDENTIALS);
    const { accessToken } = loginResponse.data.data.tokens;
    
    // Simulate concurrent token operations
    const mockStorage = {};
    
    console.log('Testing concurrent token operations...');
    
    // Simulate multiple components trying to access token simultaneously
    const operations = [];
    
    for (let i = 0; i < 10; i++) {
      operations.push(new Promise((resolve) => {
        setTimeout(() => {
          // Simulate setItem
          mockStorage['token'] = accessToken;
          
          // Immediate getItem
          const token = mockStorage['token'];
          
          resolve({
            operation: i,
            hasToken: !!token,
            tokenLength: token?.length || 0
          });
        }, Math.random() * 100); // Random delay 0-100ms
      }));
    }
    
    const results = await Promise.all(operations);
    console.log('Concurrent operations results:');
    results.forEach(result => {
      console.log(`Operation ${result.operation}: ${result.hasToken ? '✅' : '❌'} Token available`);
    });
    
    const successCount = results.filter(r => r.hasToken).length;
    console.log(`\nSuccess rate: ${successCount}/${results.length} (${(successCount/results.length*100).toFixed(1)}%)`);
    
  } catch (error) {
    console.error('❌ Race condition test failed:', error.message);
  }
}

// Run all tests
async function runAllTests() {
  await testTokenPersistence();
  await testRaceConditions();
  
  console.log('\n🏁 DIAGNOSIS COMPLETE');
  console.log('\nNext steps based on findings:');
  console.log('1. Check if tokens are being cleared by another part of the app');
  console.log('2. Add more logging to auth-tokens.ts to trace token lifecycle');
  console.log('3. Look for timing issues in component mounting/unmounting');
  console.log('4. Check if multiple auth-related components are interfering');
}

runAllTests().catch(console.error);
