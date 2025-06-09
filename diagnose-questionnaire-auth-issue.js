#!/usr/bin/env node

const axios = require('axios');
const jwt = require('jsonwebtoken');

// Configuration
const API_BASE = 'http://localhost:5000/api';
const AUTH_SERVICE = 'http://localhost:3001';
const QUESTIONNAIRE_SERVICE = 'http://localhost:3002';

// Test credentials
const TEST_CREDENTIALS = {
  email: 'jusscott@gmail.com',
  password: 'test123'
};

console.log('🔍 Diagnosing Questionnaire Authentication Issue');
console.log('==================================================');

let authToken = null;
let userInfo = null;

// Helper function to decode JWT
function decodeJWT(token) {
  try {
    const decoded = jwt.decode(token);
    return decoded;
  } catch (error) {
    return null;
  }
}

// Helper function to make authenticated requests
async function makeAuthenticatedRequest(url, token, serviceName = '') {
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'X-Request-ID': `diag-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
  };

  console.log(`\n📡 Making request to ${serviceName || 'service'}: ${url}`);
  console.log(`🔑 Token preview: ${token ? token.substring(0, 20) + '...' : 'none'}`);
  
  try {
    const response = await axios.get(url, { headers, timeout: 10000 });
    console.log(`✅ ${serviceName} Response: ${response.status} ${response.statusText}`);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    console.log(`❌ ${serviceName} Error: ${error.response?.status || 'Network'} - ${error.response?.statusText || error.message}`);
    if (error.response?.data) {
      console.log(`📄 Error details:`, JSON.stringify(error.response.data, null, 2));
    }
    return { success: false, error: error.response?.data || error.message, status: error.response?.status };
  }
}

// Step 1: Test login
async function testLogin() {
  console.log('\n🔐 Step 1: Testing Login');
  console.log('========================');
  
  try {
    const response = await axios.post(`${API_BASE}/auth/login`, TEST_CREDENTIALS, {
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.data?.success && response.data?.data?.tokens) {
      const { accessToken, refreshToken } = response.data.data.tokens;
      authToken = accessToken;
      userInfo = response.data.data.user;
      
      console.log('✅ Login successful');
      console.log(`👤 User ID: ${userInfo.id}`);
      console.log(`📧 Email: ${userInfo.email}`);
      console.log(`🔑 Token length: ${accessToken.length}`);
      
      // Decode and examine the token
      const decoded = decodeJWT(accessToken);
      if (decoded) {
        console.log(`⏰ Token issued: ${new Date(decoded.iat * 1000).toISOString()}`);
        console.log(`⏰ Token expires: ${new Date(decoded.exp * 1000).toISOString()}`);
        console.log(`🏷️ Token subject: ${decoded.sub || decoded.id || 'unknown'}`);
        
        // Check if token is expired
        const now = Math.floor(Date.now() / 1000);
        if (decoded.exp < now) {
          console.log('⚠️ WARNING: Token is already expired!');
        } else {
          console.log(`⏳ Token valid for: ${Math.floor((decoded.exp - now) / 60)} minutes`);
        }
      }
      
      return true;
    } else {
      console.log('❌ Login failed - unexpected response format');
      console.log('Response:', JSON.stringify(response.data, null, 2));
      return false;
    }
  } catch (error) {
    console.log('❌ Login failed:', error.response?.data || error.message);
    return false;
  }
}

// Step 2: Test auth service token validation
async function testAuthServiceValidation() {
  console.log('\n🔍 Step 2: Testing Auth Service Token Validation');
  console.log('===============================================');
  
  if (!authToken) {
    console.log('❌ No auth token available');
    return false;
  }
  
  return await makeAuthenticatedRequest(`${AUTH_SERVICE}/auth/validate-token`, authToken, 'Auth Service');
}

// Step 3: Test direct questionnaire service access
async function testQuestionnaireServiceDirect() {
  console.log('\n🔍 Step 3: Testing Direct Questionnaire Service Access');
  console.log('=====================================================');
  
  if (!authToken) {
    console.log('❌ No auth token available');
    return false;
  }
  
  return await makeAuthenticatedRequest(`${QUESTIONNAIRE_SERVICE}/questionnaires`, authToken, 'Questionnaire Service');
}

// Step 4: Test API Gateway routing to questionnaire service
async function testAPIGatewayRouting() {
  console.log('\n🔍 Step 4: Testing API Gateway Routing to Questionnaire Service');
  console.log('===========================================================');
  
  if (!authToken) {
    console.log('❌ No auth token available');
    return false;
  }
  
  return await makeAuthenticatedRequest(`${API_BASE}/questionnaires`, authToken, 'API Gateway');
}

// Step 5: Test questionnaire service auth middleware specifically
async function testQuestionnaireAuthMiddleware() {
  console.log('\n🔍 Step 5: Testing Questionnaire Service Auth Middleware');
  console.log('======================================================');
  
  if (!authToken) {
    console.log('❌ No auth token available');
    return false;
  }
  
  // Test the diagnostic endpoint if available
  const diagnosticResult = await makeAuthenticatedRequest(`${QUESTIONNAIRE_SERVICE}/diagnostic/auth-test`, authToken, 'Questionnaire Diagnostic');
  
  // Also test templates endpoint (common questionnaire endpoint)
  const templatesResult = await makeAuthenticatedRequest(`${QUESTIONNAIRE_SERVICE}/templates`, authToken, 'Questionnaire Templates');
  
  return diagnosticResult.success || templatesResult.success;
}

// Step 6: Test token refresh scenario
async function testTokenRefresh() {
  console.log('\n🔍 Step 6: Testing Token Refresh Scenario');
  console.log('========================================');
  
  if (!authToken) {
    console.log('❌ No auth token available');
    return false;
  }
  
  // Try to refresh the token
  try {
    const refreshToken = localStorage?.getItem?.('refreshToken'); // This won't work in Node.js, but shows the concept
    
    console.log('🔄 Attempting token refresh...');
    const response = await axios.post(`${API_BASE}/auth/refresh-token`, 
      { refreshToken: 'test-refresh-token' }, // In real scenario, this would be the actual refresh token
      { timeout: 10000 }
    );
    
    console.log('✅ Token refresh endpoint is accessible');
    return true;
  } catch (error) {
    console.log('❌ Token refresh failed:', error.response?.data || error.message);
    return false;
  }
}

// Step 7: Check questionnaire service environment
async function checkQuestionnaireEnvironment() {
  console.log('\n🔍 Step 7: Checking Questionnaire Service Environment');
  console.log('==================================================');
  
  try {
    // Check if BYPASS_AUTH is enabled
    const healthResponse = await axios.get(`${QUESTIONNAIRE_SERVICE}/health`, { timeout: 5000 });
    console.log('✅ Questionnaire service is responding');
    
    // Check diagnostic endpoint
    const diagResponse = await axios.get(`${QUESTIONNAIRE_SERVICE}/diagnostic/status`, { timeout: 5000 });
    if (diagResponse.data) {
      console.log('📊 Diagnostic info available');
      console.log('Environment details:', JSON.stringify(diagResponse.data, null, 2));
    }
    
    return true;
  } catch (error) {
    console.log('❌ Questionnaire service health check failed:', error.message);
    return false;
  }
}

// Main diagnostic function
async function runDiagnostics() {
  console.log(`🚀 Starting authentication flow diagnosis at ${new Date().toISOString()}`);
  
  const results = {};
  
  // Run all diagnostic steps
  results.login = await testLogin();
  
  if (results.login) {
    results.authService = await testAuthServiceValidation();
    results.questionnaireServiceDirect = await testQuestionnaireServiceDirect();
    results.apiGatewayRouting = await testAPIGatewayRouting();
    results.questionnaireAuthMiddleware = await testQuestionnaireAuthMiddleware();
    results.tokenRefresh = await testTokenRefresh();
  }
  
  results.environmentCheck = await checkQuestionnaireEnvironment();
  
  // Summary
  console.log('\n📋 DIAGNOSTIC SUMMARY');
  console.log('=====================');
  console.log(`🔐 Login: ${results.login ? '✅ SUCCESS' : '❌ FAILED'}`);
  console.log(`🔍 Auth Service Validation: ${results.authService?.success ? '✅ SUCCESS' : '❌ FAILED'}`);
  console.log(`📡 Questionnaire Service Direct: ${results.questionnaireServiceDirect?.success ? '✅ SUCCESS' : '❌ FAILED'}`);
  console.log(`🌐 API Gateway Routing: ${results.apiGatewayRouting?.success ? '✅ SUCCESS' : '❌ FAILED'}`);
  console.log(`🔒 Questionnaire Auth Middleware: ${results.questionnaireAuthMiddleware?.success ? '✅ SUCCESS' : '❌ FAILED'}`);
  console.log(`🔄 Token Refresh: ${results.tokenRefresh ? '✅ SUCCESS' : '❌ FAILED'}`);
  console.log(`🏥 Environment Check: ${results.environmentCheck ? '✅ SUCCESS' : '❌ FAILED'}`);
  
  // Analysis
  console.log('\n🔬 ANALYSIS');
  console.log('===========');
  
  if (results.login && results.authService?.success) {
    console.log('✅ Basic authentication flow is working');
    
    if (!results.questionnaireServiceDirect?.success) {
      console.log('❌ ISSUE: Direct questionnaire service access is failing');
      console.log('   This suggests the questionnaire service auth middleware is rejecting tokens');
      console.log('   that the auth service considers valid.');
    }
    
    if (!results.apiGatewayRouting?.success) {
      console.log('❌ ISSUE: API Gateway routing to questionnaire service is failing');
      console.log('   This could be due to token stripping or routing configuration issues.');
    }
    
    if (results.questionnaireServiceDirect?.success && !results.apiGatewayRouting?.success) {
      console.log('🔍 IDENTIFIED: The issue is with API Gateway routing, not the questionnaire service');
    }
    
    if (!results.questionnaireServiceDirect?.success && !results.apiGatewayRouting?.success) {
      console.log('🔍 IDENTIFIED: The issue is with the questionnaire service authentication middleware');
    }
  } else {
    console.log('❌ Basic authentication is failing - this is the root issue');
  }
  
  console.log('\n🔧 RECOMMENDED ACTIONS');
  console.log('======================');
  
  if (!results.login) {
    console.log('1. Check auth service logs for login failures');
    console.log('2. Verify database connectivity for user authentication');
  } else if (!results.authService?.success) {
    console.log('1. Check auth service token validation logic');
    console.log('2. Verify JWT_SECRET configuration');
  } else if (!results.questionnaireServiceDirect?.success) {
    console.log('1. Check questionnaire service auth middleware logs');
    console.log('2. Verify questionnaire service can reach auth service');
    console.log('3. Check JWT_SECRET consistency between services');
    console.log('4. Verify BYPASS_AUTH environment variable if needed');
  } else if (!results.apiGatewayRouting?.success) {
    console.log('1. Check API Gateway proxy configuration');
    console.log('2. Verify path rewriting rules');
    console.log('3. Check if API Gateway is stripping Authorization headers');
  }
  
  console.log('\n✨ Diagnosis complete!');
}

// Run the diagnostics
runDiagnostics().catch(console.error);
