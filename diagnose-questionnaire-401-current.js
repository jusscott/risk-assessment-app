#!/usr/bin/env node

/**
 * Comprehensive Diagnostic Script for Current Questionnaire 401 Error
 * 
 * This script will help identify why the questionnaires page is getting 401 errors
 * when trying to fetch in-progress submissions.
 */

const axios = require('axios');
const jwt = require('jsonwebtoken');

const API_BASE = 'http://localhost:5000/api';

// Test configuration
const TEST_USER = {
  email: 'good@test.com',
  password: 'Password123'
};

async function comprehensiveDiagnostic() {
  console.log('🔍 COMPREHENSIVE QUESTIONNAIRE 401 DIAGNOSTIC');
  console.log('=' .repeat(60));
  console.log(`Testing with user: ${TEST_USER.email}`);
  console.log(`API Base: ${API_BASE}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log('');

  try {
    // Step 1: Test basic login
    console.log('📝 STEP 1: Testing Login Flow');
    console.log('-'.repeat(30));
    
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: TEST_USER.email,
      password: TEST_USER.password
    });

    if (!loginResponse.data?.success) {
      console.error('❌ Login failed:', loginResponse.data);
      return;
    }

    console.log('✅ Login successful');
    console.log('📊 Login response structure:', {
      success: loginResponse.data.success,
      hasTokens: !!loginResponse.data.data?.tokens,
      hasAccessToken: !!loginResponse.data.data?.tokens?.accessToken,
      hasRefreshToken: !!loginResponse.data.data?.tokens?.refreshToken,
      hasUser: !!loginResponse.data.data?.user
    });

    const tokens = loginResponse.data.data?.tokens;
    if (!tokens?.accessToken) {
      console.error('❌ No access token in login response');
      return;
    }

    const accessToken = tokens.accessToken;
    const refreshToken = tokens.refreshToken;

    // Step 2: Decode and analyze the token
    console.log('\n🔍 STEP 2: Token Analysis');
    console.log('-'.repeat(30));
    
    try {
      const decodedToken = jwt.decode(accessToken, { complete: true });
      console.log('📊 Token details:', {
        tokenLength: accessToken.length,
        tokenPreview: accessToken.substring(0, 20) + '...',
        algorithm: decodedToken?.header?.alg,
        tokenType: decodedToken?.header?.typ,
        issuer: decodedToken?.payload?.iss,
        audience: decodedToken?.payload?.aud,
        subject: decodedToken?.payload?.sub,
        userId: decodedToken?.payload?.userId,
        email: decodedToken?.payload?.email,
        issuedAt: decodedToken?.payload?.iat ? new Date(decodedToken.payload.iat * 1000).toISOString() : 'N/A',
        expiresAt: decodedToken?.payload?.exp ? new Date(decodedToken.payload.exp * 1000).toISOString() : 'N/A',
        expiresInMinutes: decodedToken?.payload?.exp ? Math.round((decodedToken.payload.exp * 1000 - Date.now()) / 60000) : 'N/A'
      });

      // Check if token is expired
      const now = Math.floor(Date.now() / 1000);
      const isExpired = decodedToken?.payload?.exp && decodedToken.payload.exp < now;
      console.log(`🕒 Token status: ${isExpired ? '❌ EXPIRED' : '✅ VALID'}`);
      
    } catch (decodeError) {
      console.error('❌ Token decode error:', decodeError.message);
    }

    // Step 3: Test auth/me endpoint
    console.log('\n👤 STEP 3: Testing Auth /me Endpoint');
    console.log('-'.repeat(30));
    
    try {
      const meResponse = await axios.get(`${API_BASE}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ /auth/me successful');
      console.log('📊 User data:', {
        hasUser: !!meResponse.data?.data,
        userId: meResponse.data?.data?.id,
        email: meResponse.data?.data?.email,
        firstName: meResponse.data?.data?.firstName,
        lastName: meResponse.data?.data?.lastName
      });
    } catch (meError) {
      console.error('❌ /auth/me failed:', {
        status: meError.response?.status,
        message: meError.response?.data?.message || meError.message,
        data: meError.response?.data
      });
    }

    // Step 4: Test questionnaire service endpoints
    console.log('\n📋 STEP 4: Testing Questionnaire Endpoints');
    console.log('-'.repeat(30));
    
    const questionnaireEndpoints = [
      { name: 'Templates', url: '/questionnaires/templates', description: 'Available questionnaire templates' },
      { name: 'In-Progress', url: '/questionnaires/submissions/in-progress', description: 'In-progress submissions (FAILING)' },
      { name: 'Completed', url: '/questionnaires/submissions/completed', description: 'Completed submissions' }
    ];

    for (const endpoint of questionnaireEndpoints) {
      console.log(`\n🧪 Testing ${endpoint.name}: ${endpoint.url}`);
      console.log(`   ${endpoint.description}`);
      
      try {
        const response = await axios.get(`${API_BASE}${endpoint.url}`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'X-Request-ID': `diagnostic-${Date.now()}`
          },
          timeout: 10000
        });
        
        console.log(`✅ ${endpoint.name} successful`);
        console.log('📊 Response:', {
          status: response.status,
          hasData: !!response.data?.data,
          dataLength: Array.isArray(response.data?.data) ? response.data.data.length : 'N/A',
          success: response.data?.success
        });
        
      } catch (endpointError) {
        console.error(`❌ ${endpoint.name} failed:`, {
          status: endpointError.response?.status,
          statusText: endpointError.response?.statusText,
          message: endpointError.response?.data?.message || endpointError.message,
          url: endpointError.config?.url,
          headers: endpointError.config?.headers,
          data: endpointError.response?.data
        });
        
        // Detailed analysis for 401 errors
        if (endpointError.response?.status === 401) {
          console.log('🔍 401 Error Analysis:', {
            authHeaderSent: !!endpointError.config?.headers?.Authorization,
            authHeaderValue: endpointError.config?.headers?.Authorization ? 
              endpointError.config.headers.Authorization.substring(0, 20) + '...' : 'MISSING',
            tokenMatches: endpointError.config?.headers?.Authorization === `Bearer ${accessToken}`,
            possibleCauses: [
              'Token expired between requests',
              'Questionnaire service auth middleware issue',
              'Token format/encoding issue',
              'Service-to-service communication problem',
              'Database user validation issue'
            ]
          });
        }
      }
    }

    // Step 5: Test token refresh
    console.log('\n🔄 STEP 5: Testing Token Refresh');
    console.log('-'.repeat(30));
    
    if (refreshToken) {
      try {
        const refreshResponse = await axios.post(`${API_BASE}/auth/refresh-token`, {
          refreshToken: refreshToken
        });
        
        console.log('✅ Token refresh successful');
        const newTokens = refreshResponse.data?.data?.tokens;
        console.log('📊 New tokens:', {
          hasNewAccessToken: !!newTokens?.accessToken,
          hasNewRefreshToken: !!newTokens?.refreshToken,
          tokenChanged: newTokens?.accessToken !== accessToken
        });

        // Test problematic endpoint with refreshed token
        if (newTokens?.accessToken) {
          console.log('\n🧪 Testing in-progress endpoint with refreshed token...');
          try {
            const testResponse = await axios.get(`${API_BASE}/questionnaires/submissions/in-progress`, {
              headers: {
                'Authorization': `Bearer ${newTokens.accessToken}`,
                'Content-Type': 'application/json'
              }
            });
            console.log('✅ In-progress endpoint works with refreshed token!');
          } catch (refreshTestError) {
            console.error('❌ In-progress endpoint still fails with refreshed token:', {
              status: refreshTestError.response?.status,
              message: refreshTestError.response?.data?.message || refreshTestError.message
            });
          }
        }
      } catch (refreshError) {
        console.error('❌ Token refresh failed:', {
          status: refreshError.response?.status,
          message: refreshError.response?.data?.message || refreshError.message
        });
      }
    } else {
      console.log('❌ No refresh token available');
    }

    // Step 6: Service connectivity test
    console.log('\n🔗 STEP 6: Service Connectivity Test');
    console.log('-'.repeat(30));
    
    const services = [
      { name: 'API Gateway', url: `${API_BASE.replace('/api', '')}/health` },
      { name: 'Auth Service', url: `${API_BASE}/auth/health` },
      { name: 'Questionnaire Service', url: `${API_BASE}/questionnaires/health` }
    ];

    for (const service of services) {
      try {
        const healthResponse = await axios.get(service.url, { timeout: 5000 });
        console.log(`✅ ${service.name}: ${healthResponse.status} ${healthResponse.statusText}`);
      } catch (healthError) {
        console.error(`❌ ${service.name}: ${healthError.response?.status || 'UNREACHABLE'} ${healthError.message}`);
      }
    }

    // Step 7: Backend auth middleware test
    console.log('\n🛡️ STEP 7: Backend Auth Middleware Analysis');
    console.log('-'.repeat(30));
    
    console.log('🔍 Analyzing potential auth middleware issues...');
    
    // Test with deliberately malformed token
    try {
      await axios.get(`${API_BASE}/questionnaires/submissions/in-progress`, {
        headers: {
          'Authorization': 'Bearer invalid-token-test',
          'Content-Type': 'application/json'
        }
      });
    } catch (invalidTokenError) {
      console.log('📊 Invalid token response:', {
        status: invalidTokenError.response?.status,
        message: invalidTokenError.response?.data?.message || 'No message',
        isConsistentWith401: invalidTokenError.response?.status === 401,
        authMiddlewareWorking: invalidTokenError.response?.status === 401 ? 'YES' : 'UNCLEAR'
      });
    }

    // Test with no token
    try {
      await axios.get(`${API_BASE}/questionnaires/submissions/in-progress`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
    } catch (noTokenError) {
      console.log('📊 No token response:', {
        status: noTokenError.response?.status,
        message: noTokenError.response?.data?.message || 'No message',
        expectingAuth: noTokenError.response?.status === 401 ? 'YES' : 'NO'
      });
    }

    console.log('\n📋 DIAGNOSTIC SUMMARY');
    console.log('=' .repeat(60));
    console.log('✅ Login flow: Working');
    console.log('🔍 Check the specific endpoint failures above');
    console.log('💡 Most likely causes:');
    console.log('   1. Token timing issue (expires between requests)');
    console.log('   2. Questionnaire service auth middleware configuration');
    console.log('   3. Service-to-service token validation issue');
    console.log('   4. Database user lookup problem in questionnaire service');
    console.log('\n🛠️ Next steps:');
    console.log('   1. Check questionnaire service auth middleware logs');
    console.log('   2. Verify user ID in questionnaire service database');
    console.log('   3. Test token validation in questionnaire service');
    console.log('   4. Check for race conditions in frontend token management');

  } catch (error) {
    console.error('❌ Diagnostic failed:', error.message);
    if (error.response) {
      console.error('Response details:', {
        status: error.response.status,
        data: error.response.data
      });
    }
  }
}

// Run the diagnostic
if (require.main === module) {
  comprehensiveDiagnostic().catch(console.error);
}

module.exports = { comprehensiveDiagnostic };
