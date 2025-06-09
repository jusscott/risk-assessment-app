#!/usr/bin/env node

/**
 * Test Validate Token Endpoint Directly
 * 
 * This tests the actual /validate-token endpoint that the questionnaire
 * service is trying to use, and also analyzes the JWT token structure.
 */

const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

// Test credentials
const TEST_USER = {
    email: 'good@test.com',
    password: 'Password123'
};

async function testLogin() {
    console.log('🔐 Testing Login Flow...');
    
    try {
        const response = await axios.post(`${API_BASE}/auth/login`, TEST_USER);
        console.log('✅ Login Success');
        return response.data;
    } catch (error) {
        console.error('❌ Login Failed:', error.response?.data || error.message);
        return null;
    }
}

async function analyzeJWTStructure(token) {
    console.log('\n🔍 JWT Token Analysis:');
    
    try {
        // Decode JWT payload
        const parts = token.split('.');
        if (parts.length !== 3) {
            console.log('❌ Invalid JWT format');
            return null;
        }
        
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        console.log('📊 JWT Payload:', JSON.stringify(payload, null, 2));
        
        // Check for user ID fields
        const possibleUserIdFields = ['id', 'userId', 'user_id', 'sub'];
        let foundUserId = null;
        
        for (const field of possibleUserIdFields) {
            if (payload[field]) {
                console.log(`✅ Found user ID in field '${field}':`, payload[field]);
                foundUserId = payload[field];
                break;
            }
        }
        
        if (!foundUserId) {
            console.log('❌ No user ID found in JWT payload');
        }
        
        // Check expiration
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp) {
            console.log('⏰ Token expires at:', new Date(payload.exp * 1000).toISOString());
            console.log('⏰ Token valid for:', (payload.exp - now), 'seconds');
            
            if (payload.exp < now) {
                console.log('⚠️ TOKEN EXPIRED!');
            } else {
                console.log('✅ Token is valid');
            }
        }
        
        return payload;
        
    } catch (error) {
        console.error('❌ Failed to decode JWT:', error.message);
        return null;
    }
}

async function testValidateTokenEndpoint(token) {
    console.log('\n🎯 Testing /auth/validate-token Endpoint...');
    
    try {
        const response = await axios.post(`${API_BASE}/auth/validate-token`, {}, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Validate token endpoint success:', response.status);
        console.log('📊 Response:', JSON.stringify(response.data, null, 2));
        
        return response.data;
        
    } catch (error) {
        console.error('❌ Validate token endpoint failed:', {
            status: error.response?.status,
            message: error.response?.data?.message || error.message,
            data: error.response?.data
        });
        
        return null;
    }
}

async function testDirectQuestionnaireServiceCall(token) {
    console.log('\n🏗️ Testing Direct Questionnaire Service Call...');
    
    try {
        // Call questionnaire service directly, bypassing API Gateway
        const response = await axios.get(
            'http://localhost:5003/api/questionnaires/templates/1?page=1&pageSize=50&loadQuestions=true',
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        console.log('✅ Direct questionnaire service call success:', response.status);
        
    } catch (error) {
        console.error('❌ Direct questionnaire service call failed:', {
            status: error.response?.status,
            message: error.response?.data || error.message
        });
    }
}

async function testEnhancedClientPath() {
    console.log('\n🔗 Testing Enhanced Client Network Path...');
    
    // Test if questionnaire service can reach auth service
    const authServiceUrl = 'http://auth-service:5001';
    const fallbackAuthUrl = 'http://localhost:5001';
    
    try {
        console.log('🔍 Testing internal auth service URL:', authServiceUrl);
        // This won't work from outside Docker, but we can test the concept
        console.log('⚠️ Cannot test internal Docker network from host');
        
        console.log('🔍 Testing fallback auth service URL:', fallbackAuthUrl);
        const response = await axios.get(`${fallbackAuthUrl}/api/auth/health`, { timeout: 3000 });
        console.log('✅ Auth service reachable on localhost:', response.status);
        
    } catch (error) {
        console.log('❌ Auth service connectivity test failed:', error.message);
    }
}

async function main() {
    console.log('🔍 VALIDATE TOKEN ENDPOINT TEST');
    console.log('===============================\n');
    
    // Test login and get token
    const authData = await testLogin();
    if (!authData?.data?.tokens?.accessToken) {
        console.log('\n❌ Cannot proceed - no token available');
        return;
    }
    
    const token = authData.data.tokens.accessToken;
    
    // Analyze JWT structure
    const payload = await analyzeJWTStructure(token);
    
    // Test the validate-token endpoint directly
    const validateResult = await testValidateTokenEndpoint(token);
    
    // Test direct questionnaire service call
    await testDirectQuestionnaireServiceCall(token);
    
    // Test network connectivity
    await testEnhancedClientPath();
    
    console.log('\n📋 ANALYSIS SUMMARY:');
    console.log('===================');
    
    if (payload) {
        const hasUserId = payload.id || payload.userId || payload.user_id || payload.sub;
        console.log('- JWT contains user ID:', !!hasUserId);
        console.log('- JWT user ID value:', hasUserId);
        console.log('- JWT is valid:', payload.exp > Math.floor(Date.now() / 1000));
    }
    
    console.log('- Validate endpoint works:', !!validateResult);
    console.log('- Issue likely in enhanced client service-to-service communication');
}

if (require.main === module) {
    main().catch(console.error);
}
