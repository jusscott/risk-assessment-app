#!/usr/bin/env node

const axios = require('axios');
const jwt = require('jsonwebtoken');

/**
 * Comprehensive diagnostic for dashboard 401 errors
 * Analyzes token state, validity, and authentication flow
 */

const API_URL = 'http://localhost:5000';
const FRONTEND_URL = 'http://localhost:3000';

console.log('🔍 Dashboard 401 Error Diagnostic');
console.log('==================================\n');

async function diagnoseDashboard401Issue() {
  try {
    console.log('📋 STEP 1: Check Browser Token State');
    console.log('------------------------------------');
    
    // Simulate getting token from browser localStorage
    // We'll need to check what's actually stored
    const puppeteer = require('puppeteer');
    
    const browser = await puppeteer.launch({ 
      headless: false,
      defaultViewport: null,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Navigate to the frontend
    console.log(`Navigating to ${FRONTEND_URL}...`);
    await page.goto(FRONTEND_URL, { waitUntil: 'networkidle0' });
    
    // Get tokens from localStorage
    const tokenInfo = await page.evaluate(() => {
      const token = localStorage.getItem('token');
      const refreshToken = localStorage.getItem('refreshToken');
      const lastTokenRefresh = localStorage.getItem('lastTokenRefresh');
      
      return {
        hasToken: !!token,
        hasRefreshToken: !!refreshToken,
        tokenLength: token ? token.length : 0,
        refreshTokenLength: refreshToken ? refreshToken.length : 0,
        tokenPreview: token ? token.substring(0, 50) + '...' : null,
        lastRefreshTime: lastTokenRefresh,
        localStorageKeys: Object.keys(localStorage)
      };
    });
    
    console.log('Browser Token State:', JSON.stringify(tokenInfo, null, 2));
    
    if (!tokenInfo.hasToken) {
      console.log('❌ No access token found in browser localStorage');
      console.log('💡 User needs to log in again');
      await browser.close();
      return;
    }
    
    // Get the actual token for analysis
    const actualToken = await page.evaluate(() => localStorage.getItem('token'));
    const actualRefreshToken = await page.evaluate(() => localStorage.getItem('refreshToken'));
    
    console.log('\n📋 STEP 2: Analyze Token Content');
    console.log('----------------------------------');
    
    let decodedToken = null;
    let tokenValid = false;
    let tokenExpired = false;
    
    try {
      decodedToken = jwt.decode(actualToken);
      const currentTime = Math.floor(Date.now() / 1000);
      tokenExpired = decodedToken.exp <= currentTime;
      tokenValid = !tokenExpired;
      
      console.log('Token Analysis:');
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
      tokenValid = false;
    }
    
    console.log('\n📋 STEP 3: Test API Endpoints');
    console.log('------------------------------');
    
    // Test auth/me endpoint
    console.log('Testing /auth/me endpoint...');
    try {
      const meResponse = await axios.get(`${API_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${actualToken}`,
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
    
    // Test questionnaire endpoint that's failing
    console.log('\nTesting /questionnaires/submissions/in-progress endpoint...');
    try {
      const questionnaireResponse = await axios.get(`${API_URL}/api/questionnaires/submissions/in-progress`, {
        headers: {
          'Authorization': `Bearer ${actualToken}`,
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
        console.log('🔍 Analyzing 401 error details...');
        
        // Check if it's a token format issue, expired token, or service-specific issue
        if (questionnaireError.response?.data?.message) {
          console.log(`Auth Error Message: ${questionnaireError.response.data.message}`);
        }
        
        // Check response headers for clues
        const authHeader = questionnaireError.response?.headers?.['www-authenticate'];
        if (authHeader) {
          console.log(`WWW-Authenticate Header: ${authHeader}`);
        }
      }
    }
    
    console.log('\n📋 STEP 4: Test Token Refresh');
    console.log('------------------------------');
    
    if (actualRefreshToken) {
      console.log('Testing token refresh...');
      try {
        const refreshResponse = await axios.post(`${API_URL}/api/auth/refresh-token`, {
          refreshToken: actualRefreshToken
        }, {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 10000
        });
        
        console.log('✅ Token refresh successful:', {
          status: refreshResponse.status,
          hasNewTokens: !!(refreshResponse.data?.data?.tokens),
          newTokenPreview: refreshResponse.data?.data?.tokens?.accessToken?.substring(0, 50) + '...'
        });
        
        // Test the questionnaire endpoint with the new token
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
            
            // Update browser localStorage with new tokens
            await page.evaluate((newToken, newRefreshToken) => {
              localStorage.setItem('token', newToken);
              localStorage.setItem('refreshToken', newRefreshToken);
              localStorage.setItem('lastTokenRefresh', Date.now().toString());
              console.log('✅ Browser tokens updated');
            }, refreshResponse.data.data.tokens.accessToken, refreshResponse.data.data.tokens.refreshToken);
            
            console.log('\n🎉 SOLUTION APPLIED: Browser tokens have been refreshed');
            console.log('Try refreshing your dashboard page now.');
            
          } catch (retryError) {
            console.log('❌ Questionnaire endpoint still failing with new token:', {
              status: retryError.response?.status,
              message: retryError.response?.data?.message || retryError.message
            });
          }
        }
        
      } catch (refreshError) {
        console.log('❌ Token refresh failed:', {
          status: refreshError.response?.status,
          message: refreshError.response?.data?.message || refreshError.message,
          data: refreshError.response?.data
        });
      }
    } else {
      console.log('❌ No refresh token available');
    }
    
    console.log('\n📋 STEP 5: Service Health Check');
    console.log('--------------------------------');
    
    // Check if questionnaire service is running
    try {
      const healthResponse = await axios.get(`${API_URL}/api/health`, {
        timeout: 5000
      });
      console.log('✅ API Gateway health check passed:', healthResponse.status);
    } catch (healthError) {
      console.log('❌ API Gateway health check failed:', healthError.message);
    }
    
    // Check specific questionnaire service health
    try {
      const questionnaireHealthResponse = await axios.get(`${API_URL}/api/questionnaires/health`, {
        timeout: 5000
      });
      console.log('✅ Questionnaire service health check passed:', questionnaireHealthResponse.status);
    } catch (questionnaireHealthError) {
      console.log('❌ Questionnaire service health check failed:', {
        status: questionnaireHealthError.response?.status,
        message: questionnaireHealthError.message
      });
    }
    
    console.log('\n📋 DIAGNOSTIC SUMMARY');
    console.log('======================');
    
    if (!tokenInfo.hasToken) {
      console.log('🔴 ISSUE: No authentication token found');
      console.log('💡 SOLUTION: User needs to log in again');
    } else if (tokenExpired) {
      console.log('🔴 ISSUE: Authentication token has expired');
      console.log('💡 SOLUTION: Token refresh needed (attempted above)');
    } else if (tokenValid) {
      console.log('🟡 ISSUE: Token appears valid but questionnaire service rejects it');
      console.log('💡 SOLUTION: Check questionnaire service authentication middleware');
    } else {
      console.log('🔴 ISSUE: Token exists but is malformed or invalid');
      console.log('💡 SOLUTION: Clear tokens and log in again');
    }
    
    await browser.close();
    
  } catch (error) {
    console.error('❌ Diagnostic failed:', error.message);
    console.error(error.stack);
  }
}

// Run the diagnostic
diagnoseDashboard401Issue().catch(console.error);
