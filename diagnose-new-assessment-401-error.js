#!/usr/bin/env node

/**
 * Diagnose New Assessment 401 Error
 * 
 * Comprehensive diagnostic for the 401 error occurring when users
 * click "Start new assessment" after successful login.
 * 
 * Error Pattern:
 * - User successfully logs in
 * - Token refresh mechanism triggers
 * - Still getting 401 on /questionnaires/templates/1
 */

const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';
const FRONTEND_URL = 'http://localhost:3000';

// Test credentials
const TEST_USER = {
    email: 'good@test.com',
    password: 'Password123'
};

async function testLogin() {
    console.log('🔐 Testing Login Flow...');
    
    try {
        const response = await axios.post(`${API_BASE}/auth/login`, TEST_USER);
        
        console.log('✅ Login Response Status:', response.status);
        console.log('📋 Login Response Headers:', {
            'content-type': response.headers['content-type'],
            'set-cookie': response.headers['set-cookie'] || 'None'
        });
        
        console.log('📊 Login Response Structure:');
        console.log(JSON.stringify(response.data, null, 2));
        
        return response.data;
    } catch (error) {
        console.error('❌ Login Failed:', {
            status: error.response?.status,
            message: error.response?.data?.message || error.message,
            data: error.response?.data
        });
        return null;
    }
}

async function testQuestionnaireEndpoint(authData) {
    console.log('\n🎯 Testing Questionnaire Template Endpoint...');
    
    if (!authData) {
        console.log('❌ No auth data available for questionnaire test');
        return;
    }
    
    // Extract token from different possible locations
    let token = null;
    if (authData.data?.tokens?.accessToken) {
        token = authData.data.tokens.accessToken;
        console.log('📱 Using token from authData.data.tokens.accessToken');
    } else if (authData.tokens?.accessToken) {
        token = authData.tokens.accessToken;
        console.log('📱 Using token from authData.tokens.accessToken');
    } else if (authData.token) {
        token = authData.token;
        console.log('📱 Using token from authData.token');
    } else if (authData.access_token) {
        token = authData.access_token;
        console.log('📱 Using token from authData.access_token');
    }
    
    if (!token) {
        console.log('❌ No token found in auth data');
        console.log('Available keys:', Object.keys(authData));
        return;
    }
    
    console.log('🔑 Token preview:', token.substring(0, 20) + '...');
    
    try {
        const response = await axios.get(
            `${API_BASE}/questionnaires/templates/1?page=1&pageSize=50&loadQuestions=true`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        console.log('✅ Questionnaire endpoint success:', response.status);
        console.log('📊 Response data preview:', {
            keys: Object.keys(response.data || {}),
            dataLength: JSON.stringify(response.data || {}).length
        });
        
    } catch (error) {
        console.error('❌ Questionnaire endpoint failed:', {
            status: error.response?.status,
            message: error.response?.data?.message || error.message,
            headers: error.response?.headers,
            data: error.response?.data
        });
        
        if (error.response?.status === 401) {
            console.log('\n🔍 401 Error Analysis:');
            console.log('- Token format appears to be:', typeof token);
            console.log('- Token length:', token.length);
            console.log('- Authorization header sent:', `Bearer ${token.substring(0, 20)}...`);
            
            // Try to decode the JWT payload
            try {
                const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
                console.log('- Token payload preview:', {
                    exp: payload.exp,
                    iat: payload.iat,
                    userId: payload.userId || payload.user_id || payload.sub,
                    expires: new Date(payload.exp * 1000).toISOString()
                });
                
                const now = Math.floor(Date.now() / 1000);
                if (payload.exp < now) {
                    console.log('⚠️ TOKEN EXPIRED! Exp:', payload.exp, 'Now:', now);
                } else {
                    console.log('✅ Token not expired. Valid for', (payload.exp - now), 'more seconds');
                }
            } catch (jwtError) {
                console.log('❌ Could not decode token payload:', jwtError.message);
            }
        }
    }
}

async function testAuthMeEndpoint(authData) {
    console.log('\n👤 Testing Auth /me Endpoint...');
    
    if (!authData) {
        console.log('❌ No auth data available for /me test');
        return;
    }
    
    let token = authData.data?.tokens?.accessToken || authData.tokens?.accessToken || authData.token || authData.access_token;
    if (!token) {
        console.log('❌ No token found for /me test');
        return;
    }
    
    try {
        const response = await axios.get(`${API_BASE}/auth/me`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Auth /me endpoint success:', response.status);
        console.log('📊 User data:', response.data);
        
    } catch (error) {
        console.error('❌ Auth /me endpoint failed:', {
            status: error.response?.status,
            message: error.response?.data?.message || error.message,
            data: error.response?.data
        });
    }
}

async function testTokenRefresh(authData) {
    console.log('\n🔄 Testing Token Refresh...');
    
    if (!authData?.data?.tokens?.refreshToken) {
        console.log('❌ No refresh token available');
        return;
    }
    
    try {
        const response = await axios.post(`${API_BASE}/auth/refresh`, {
            refreshToken: authData.data.tokens.refreshToken
        });
        
        console.log('✅ Token refresh success:', response.status);
        console.log('📊 New token data:', {
            hasAccessToken: !!response.data.tokens?.accessToken,
            hasRefreshToken: !!response.data.tokens?.refreshToken,
            tokenPreview: response.data.tokens?.accessToken?.substring(0, 20) + '...'
        });
        
        return response.data;
        
    } catch (error) {
        console.error('❌ Token refresh failed:', {
            status: error.response?.status,
            message: error.response?.data?.message || error.message,
            data: error.response?.data
        });
        return null;
    }
}

async function checkServiceHealth() {
    console.log('\n🏥 Checking Service Health...');
    
    const services = [
        { name: 'API Gateway', url: `${API_BASE}/health` },
        { name: 'Auth Service', url: `${API_BASE}/auth/health` },
        { name: 'Questionnaire Service', url: `${API_BASE}/questionnaires/health` }
    ];
    
    for (const service of services) {
        try {
            const response = await axios.get(service.url, { timeout: 5000 });
            console.log(`✅ ${service.name}: ${response.status} - ${response.data?.status || 'OK'}`);
        } catch (error) {
            console.log(`❌ ${service.name}: ${error.response?.status || 'UNREACHABLE'} - ${error.message}`);
        }
    }
}

async function main() {
    console.log('🔍 NEW ASSESSMENT 401 ERROR DIAGNOSTIC');
    console.log('=====================================\n');
    
    // Check service health first
    await checkServiceHealth();
    
    // Test login flow
    const authData = await testLogin();
    if (!authData) {
        console.log('\n❌ Cannot proceed with tests - login failed');
        return;
    }
    
    // Test auth/me endpoint to verify token works
    await testAuthMeEndpoint(authData);
    
    // Test the failing questionnaire endpoint
    await testQuestionnaireEndpoint(authData);
    
    // Test token refresh mechanism
    const refreshedAuth = await testTokenRefresh(authData);
    if (refreshedAuth) {
        console.log('\n🔄 Testing questionnaire endpoint with refreshed token...');
        await testQuestionnaireEndpoint(refreshedAuth);
    }
    
    console.log('\n📋 DIAGNOSTIC SUMMARY:');
    console.log('- Check if login provides correct token structure');
    console.log('- Verify token is valid and not expired');
    console.log('- Test if auth/me works but questionnaire endpoint fails');
    console.log('- Check if token refresh resolves the issue');
    console.log('- Look for service-specific authentication middleware differences');
}

if (require.main === module) {
    main().catch(console.error);
}
