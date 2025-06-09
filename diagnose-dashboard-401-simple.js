#!/usr/bin/env node

const axios = require('axios');
const jwt = require('jsonwebtoken');

/**
 * Simple diagnostic for dashboard 401 errors
 * Tests API endpoints and analyzes authentication flow
 */

const API_URL = 'http://localhost:5000';

console.log('🔍 Dashboard 401 Error Simple Diagnostic');
console.log('=========================================\n');

async function diagnoseDashboard401Simple() {
  try {
    console.log('📋 STEP 1: Test API Gateway Health');
    console.log('-----------------------------------');
    
    try {
      const healthResponse = await axios.get(`${API_URL}/api/health`, {
        timeout: 5000
      });
      console.log('✅ API Gateway health check passed:', healthResponse.status);
    } catch (healthError) {
      console.log('❌ API Gateway health check failed:', healthError.message);
      return;
    }
    
    console.log('\n📋 STEP 2: Test Auth Service');
    console.log('-----------------------------');
    
    // Test login to get a fresh token
    console.log('Testing login with test credentials...');
    try {
      const loginResponse = await axios.post(`${API_URL}/api/auth/login`, {
        email: 'good@test.com',
        password: 'Password123'
      }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      });
      
      if (loginResponse.data?.success && loginResponse.data?.data?.tokens) {
        const { accessToken, refreshToken } = loginResponse.data.data.tokens;
        
        console.log('✅ Login successful:', {
          status: loginResponse.status,
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken,
          tokenPreview: accessToken.substring(0, 50) + '...'
        });
        
        // Decode the token to see its content
        try {
          const decodedToken = jwt.decode(accessToken);
          const currentTime = Math.floor(Date.now() / 1000);
          const tokenExpired = decodedToken.exp <= currentTime;
          
          console.log('\nToken Analysis:');
          console.log(`  User ID: ${decodedToken.id}`);
          console.log(`  Email: ${decodedToken.email}`);
          console.log(`  Role: ${decodedToken.role}`);
          console.log(`  Issued: ${new Date(decodedToken.iat * 1000).toISOString()}`);
          console.log(`  Expires: ${new Date(decodedToken.exp * 1000).toISOString()}`);
          console.log(`  Current Time: ${new Date().toISOString()}`);
          console.log(`  Is Expired: ${tokenExpired}`);
          console.log(`  Time Until Expiry: ${decodedToken.exp - currentTime} seconds`);
          
        } catch (decodeError) {
          console.log('❌ Failed to decode token:', decodeError.message);
        }
        
        console.log('\n📋 STEP 3: Test Auth/Me Endpoint');
        console.log('---------------------------------');
        
        try {
          const meResponse = await axios.get(`${API_URL}/api/auth/me`, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            timeout: 10000
          });
          
          console.log('✅ /auth/me endpoint successful:', {
            status: meResponse.status,
            user: meResponse.data.data
          });
          
        } catch (meError) {
          console.log('❌ /auth/me endpoint failed:', {
            status: meError.response?.status,
            message: meError.response?.data?.message || meError.message,
            data: meError.response?.data
          });
        }
        
        console.log('\n📋 STEP 4: Test Questionnaire Endpoint');
        console.log('--------------------------------------');
        
        try {
          const questionnaireResponse = await axios.get(`${API_URL}/api/questionnaires/submissions/in-progress`, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            timeout: 10000
          });
          
          console.log('✅ Questionnaire endpoint successful:', {
            status: questionnaireResponse.status,
            dataCount: Array.isArray(questionnaireResponse.data?.data) ? questionnaireResponse.data.data.length : 'not array',
            responseStructure: Object.keys(questionnaireResponse.data || {})
          });
          
        } catch (questionnaireError) {
          console.log('❌ Questionnaire endpoint failed:', {
            status: questionnaireError.response?.status,
            message: questionnaireError.response?.data?.message || questionnaireError.message,
            data: questionnaireError.response?.data,
            headers: questionnaireError.response?.headers
          });
          
          // This is likely where our 401 error is coming from
          if (questionnaireError.response?.status === 401) {
            console.log('\n🔍 Analyzing 401 error details...');
            
            // Check if it's a token format issue, expired token, or service-specific issue
            if (questionnaireError.response?.data?.message) {
              console.log(`Auth Error Message: ${questionnaireError.response.data.message}`);
            }
            
            // Check response headers for clues
            const authHeader = questionnaireError.response?.headers?.['www-authenticate'];
            if (authHeader) {
              console.log(`WWW-Authenticate Header: ${authHeader}`);
            }
            
            console.log('\n📋 STEP 5: Test Questionnaire Service Auth Middleware');
            console.log('-----------------------------------------------------');
            
            // Let's check if the issue is specific to the questionnaire service
            // by testing other questionnaire endpoints
            
            console.log('Testing /questionnaires/templates endpoint...');
            try {
              const templatesResponse = await axios.get(`${API_URL}/api/questionnaires/templates`, {
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                  'Content-Type': 'application/json'
                },
                timeout: 10000
              });
              
              console.log('✅ Templates endpoint successful:', {
                status: templatesResponse.status,
                dataCount: Array.isArray(templatesResponse.data?.data) ? templatesResponse.data.data.length : 'not array'
              });
              
              console.log('🟡 FINDING: Templates endpoint works but submissions/in-progress doesn\'t');
              console.log('💡 This suggests the issue is specific to the submissions controller or endpoint');
              
            } catch (templatesError) {
              console.log('❌ Templates endpoint also failed:', {
                status: templatesError.response?.status,
                message: templatesError.response?.data?.message || templatesError.message
              });
              
              console.log('🔴 FINDING: All questionnaire endpoints failing with same token');
              console.log('💡 This suggests the issue is in the questionnaire service auth middleware');
            }
          }
        }
        
        console.log('\n📋 STEP 6: Test Token Refresh');
        console.log('------------------------------');
        
        try {
          const refreshResponse = await axios.post(`${API_URL}/api/auth/refresh-token`, {
            refreshToken: refreshToken
          }, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 10000
          });
          
          console.log('✅ Token refresh successful:', {
            status: refreshResponse.status,
            hasNewTokens: !!(refreshResponse.data?.data?.tokens)
          });
          
          if (refreshResponse.data?.data?.tokens?.accessToken) {
            console.log('\nTesting questionnaire endpoint with refreshed token...');
            try {
              const retryResponse = await axios.get(`${API_URL}/api/questionnaires/submissions/in-progress`, {
                headers: {
                  'Authorization': `Bearer ${refreshResponse.data.data.tokens.accessToken}`,
                  'Content-Type': 'application/json'
                },
                timeout: 10000
              });
              
              console.log('✅ Questionnaire endpoint with new token successful:', {
                status: retryResponse.status,
                dataCount: Array.isArray(retryResponse.data?.data) ? retryResponse.data.data.length : 'not array'
              });
              
              console.log('\n🟢 SOLUTION IDENTIFIED: Token refresh resolves the issue');
              console.log('💡 The original token was likely expired or the browser token state is stale');
              
            } catch (retryError) {
              console.log('❌ Questionnaire endpoint still failing with new token:', {
                status: retryError.response?.status,
                message: retryError.response?.data?.message || retryError.message
              });
              
              console.log('\n🔴 DEEPER ISSUE: Even fresh tokens are being rejected');
              console.log('💡 This suggests a problem with the questionnaire service auth middleware');
            }
          }
          
        } catch (refreshError) {
          console.log('❌ Token refresh failed:', {
            status: refreshError.response?.status,
            message: refreshError.response?.data?.message || refreshError.message
          });
        }
        
      } else {
        console.log('❌ Login failed - invalid response format:', loginResponse.data);
      }
      
    } catch (loginError) {
      console.log('❌ Login failed:', {
        status: loginError.response?.status,
        message: loginError.response?.data?.message || loginError.message,
        data: loginError.response?.data
      });
      
      if (loginError.response?.status === 401) {
        console.log('🔴 Authentication credentials are invalid');
        console.log('💡 Need to check if test user exists and has correct password');
      }
    }
    
    console.log('\n📋 DIAGNOSTIC SUMMARY');
    console.log('======================');
    console.log('Based on the test results above:');
    console.log('1. If login failed: Check test user credentials');
    console.log('2. If auth/me failed: Check auth service');
    console.log('3. If questionnaire endpoint failed: Check questionnaire service auth middleware');
    console.log('4. If token refresh fixed it: Browser token is stale and needs refresh');
    console.log('5. If fresh tokens still fail: Questionnaire service auth middleware issue');
    
  } catch (error) {
    console.error('❌ Diagnostic failed:', error.message);
    console.error(error.stack);
  }
}

// Run the diagnostic
diagnoseDashboard401Simple().catch(console.error);
