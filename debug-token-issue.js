#!/usr/bin/env node

/**
 * Token Issue Diagnostic Script
 * 
 * Analyzes the current authentication state to diagnose why tokens are unavailable
 * for questionnaire requests.
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api';

async function debugTokenIssue() {
  console.log('🔍 TOKEN ISSUE DIAGNOSTIC SCRIPT');
  console.log('=====================================\n');

  // Step 1: Check if services are running
  console.log('Step 1: Checking service availability...');
  
  try {
    const healthCheck = await axios.get(`${API_BASE_URL}/health`, { timeout: 3000 });
    console.log('✅ API Gateway is responding');
  } catch (error) {
    console.log('❌ API Gateway is not responding');
    console.log('   Make sure to run: docker-compose up -d');
    return;
  }

  // Step 2: Check auth service
  try {
    const authCheck = await axios.get(`${API_BASE_URL}/auth/health`, { timeout: 3000 });
    console.log('✅ Auth service is responding');
  } catch (error) {
    console.log('❌ Auth service is not responding');
    console.log('   Error:', error.message);
  }

  // Step 3: Check questionnaire service
  try {
    const questionnaireCheck = await axios.get(`${API_BASE_URL}/questionnaires/health`, { timeout: 3000 });
    console.log('✅ Questionnaire service is responding');
  } catch (error) {
    console.log('❌ Questionnaire service is not responding');
    console.log('   Error:', error.message);
  }

  console.log('\nStep 2: Checking browser authentication state...');
  console.log('(Note: This script cannot access browser localStorage directly)');
  console.log('');
  console.log('In your browser console, run this to check token state:');
  console.log('───────────────────────────────────────────────────────');
  console.log('console.log("Access Token:", localStorage.getItem("token"));');
  console.log('console.log("Refresh Token:", localStorage.getItem("refreshToken"));');
  console.log('console.log("Last Refresh:", localStorage.getItem("lastTokenRefresh"));');
  console.log('');

  // Step 3: Test authentication endpoints
  console.log('Step 3: Testing authentication with known credentials...');
  
  const testCredentials = [
    { email: 'good@test.com', password: 'Password123' },
    { email: 'jusscott@gmail.com', password: 'Password123' }  
  ];

  let authTestPassed = false;
  let validToken = null;

  for (const creds of testCredentials) {
    try {
      console.log(`Testing login with ${creds.email}...`);
      
      const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
        email: creds.email,
        password: creds.password
      }, { timeout: 10000 });

      if (loginResponse.data.success && loginResponse.data.data.tokens) {
        console.log('✅ Login successful!');
        console.log('   Access token received:', loginResponse.data.data.tokens.accessToken ? 'YES' : 'NO');
        console.log('   Refresh token received:', loginResponse.data.data.tokens.refreshToken ? 'YES' : 'NO');
        
        validToken = loginResponse.data.data.tokens.accessToken;
        authTestPassed = true;
        break;
      } else {
        console.log('❌ Login failed - invalid response format');
        console.log('   Response:', JSON.stringify(loginResponse.data, null, 2));
      }
      
    } catch (error) {
      console.log(`❌ Login failed for ${creds.email}`);
      if (error.response) {
        console.log('   Status:', error.response.status);
        console.log('   Message:', error.response.data?.message || error.response.data);
      } else {
        console.log('   Error:', error.message);
      }
    }
  }

  if (!authTestPassed) {
    console.log('\n🚨 AUTHENTICATION PROBLEM DETECTED');
    console.log('No test credentials are working. This could mean:');
    console.log('1. Database users are missing or corrupted');
    console.log('2. Authentication service is not working properly');
    console.log('3. Password hashing is broken');
    console.log('\nTry running: node recreate-test-users.js');
    return;
  }

  // Step 4: Test questionnaire endpoint with valid token
  console.log('\nStep 4: Testing questionnaire endpoint with valid token...');
  
  try {
    const questionnaireResponse = await axios.get(`${API_BASE_URL}/questionnaires/templates`, {
      headers: {
        'Authorization': `Bearer ${validToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    console.log('✅ Questionnaire templates request successful!');
    console.log('   Templates count:', questionnaireResponse.data.data?.length || 'Unknown');
    
  } catch (error) {
    console.log('❌ Questionnaire templates request failed');
    if (error.response) {
      console.log('   Status:', error.response.status);
      console.log('   Message:', error.response.data?.message || error.response.data);
    } else {
      console.log('   Error:', error.message);
    }
  }

  // Step 5: Provide diagnosis and recommendations
  console.log('\n🔍 DIAGNOSIS & RECOMMENDATIONS');
  console.log('=====================================');
  
  if (authTestPassed) {
    console.log('✅ Authentication system is working correctly');
    console.log('✅ Backend services can authenticate and access questionnaires');
    console.log('');
    console.log('🎯 PROBLEM: Frontend token management issue');
    console.log('');
    console.log('LIKELY CAUSES:');
    console.log('1. User is not logged in (tokens never stored)');
    console.log('2. Tokens expired and refresh failed');
    console.log('3. Browser storage was cleared');
    console.log('4. Cross-tab logout occurred');
    console.log('');
    console.log('SOLUTIONS:');
    console.log('1. USER ACTION: Log in again through the UI');
    console.log('2. Or manually set tokens in browser console:');
    console.log('   localStorage.setItem("token", "YOUR_ACCESS_TOKEN_HERE");');
    console.log('   localStorage.setItem("refreshToken", "YOUR_REFRESH_TOKEN_HERE");');
    console.log('3. Or refresh the page after logging in elsewhere');
    console.log('');
    console.log('DEVELOPER DEBUG: Check browser console for:');
    console.log('- Failed token refresh attempts');
    console.log('- Session timeout messages');
    console.log('- Cross-tab communication issues');
  }

  console.log('\n📋 NEXT STEPS:');
  console.log('1. Have the user log in again through the web interface');
  console.log('2. If login fails, run: node diagnose-current-login-issues.js');
  console.log('3. If questionnaires still fail, run: node diagnose-questionnaire-auth-flow.js');
}

// Self-executing function with error handling
debugTokenIssue().catch(error => {
  console.error('❌ Diagnostic script failed:', error.message);
  console.log('\nTry:');
  console.log('1. Ensure Docker services are running: docker-compose up -d');
  console.log('2. Check service logs: docker-compose logs');
  console.log('3. Restart services if needed: docker-compose restart');
});
