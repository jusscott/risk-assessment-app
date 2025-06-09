#!/usr/bin/env node

const axios = require('axios');

/**
 * Comprehensive authentication flow diagnostic for questionnaire access
 * This script tests the complete authentication flow from login to questionnaire access
 */

const API_URL = 'http://localhost:5000';
const TEST_EMAIL = 'jusscott@gmail.com';
const TEST_PASSWORD = 'Password123';

async function diagnoseQuestionnaireAuthFlow() {
    console.log('\n=== Questionnaire Authentication Flow Diagnostic ===\n');

    let accessToken = null;
    let refreshToken = null;

    try {
        // Step 1: Test login
        console.log('🔍 Step 1: Testing user login...');
        const loginResponse = await axios.post(`${API_URL}/api/auth/login`, {
            email: TEST_EMAIL,
            password: TEST_PASSWORD
        });

        if (loginResponse.data.success) {
            accessToken = loginResponse.data.data.tokens.accessToken;
            refreshToken = loginResponse.data.data.tokens.refreshToken;
            
            console.log('✅ Login successful');
            console.log(`   - Access Token: ${accessToken ? accessToken.substring(0, 20) + '...' : 'MISSING'}`);
            console.log(`   - Refresh Token: ${refreshToken ? refreshToken.substring(0, 20) + '...' : 'MISSING'}`);
            console.log(`   - User ID: ${loginResponse.data.data.user.id}`);
        } else {
            console.log('❌ Login failed:', loginResponse.data);
            return;
        }

        // Step 2: Test /auth/me endpoint
        console.log('\n🔍 Step 2: Testing /auth/me endpoint...');
        try {
            const meResponse = await axios.get(`${API_URL}/api/auth/me`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (meResponse.data) {
                console.log('✅ /auth/me successful');
                console.log(`   - User: ${meResponse.data.firstName} ${meResponse.data.lastName}`);
                console.log(`   - Email: ${meResponse.data.email}`);
            }
        } catch (meError) {
            console.log('❌ /auth/me failed:', meError.response?.status, meError.response?.data || meError.message);
        }

        // Step 3: Test questionnaire templates WITHOUT token
        console.log('\n🔍 Step 3: Testing questionnaire templates WITHOUT token...');
        try {
            const noTokenResponse = await axios.get(`${API_URL}/api/questionnaires/templates`, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            console.log('✅ Templates request without token succeeded (this might be expected)');
            console.log(`   - Templates found: ${noTokenResponse.data.data?.length || 0}`);
        } catch (noTokenError) {
            console.log('❌ Templates without token failed:', noTokenError.response?.status, noTokenError.response?.data?.message || noTokenError.message);
        }

        // Step 4: Test questionnaire templates WITH token
        console.log('\n🔍 Step 4: Testing questionnaire templates WITH token...');
        try {
            const templatesResponse = await axios.get(`${API_URL}/api/questionnaires/templates`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (templatesResponse.data.success) {
                console.log('✅ Templates request with token successful');
                console.log(`   - Templates found: ${templatesResponse.data.data.length}`);
                console.log(`   - Sample template: ${templatesResponse.data.data[0]?.name}`);
            }
        } catch (templatesError) {
            console.log('❌ Templates with token failed:', templatesError.response?.status, templatesError.response?.data?.message || templatesError.message);
            
            if (templatesError.response?.status === 401) {
                console.log('   ⚠️  This is the issue! 401 error when accessing templates with token');
            }
        }

        // Step 5: Test in-progress submissions (requires auth)
        console.log('\n🔍 Step 5: Testing in-progress submissions (requires auth)...');
        try {
            const inProgressResponse = await axios.get(`${API_URL}/api/questionnaires/submissions/in-progress`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('✅ In-progress submissions successful');
            console.log(`   - Submissions found: ${inProgressResponse.data.data?.length || 0}`);
        } catch (inProgressError) {
            console.log('❌ In-progress submissions failed:', inProgressError.response?.status, inProgressError.response?.data?.message || inProgressError.message);
        }

        // Step 6: Test completed submissions (requires auth)
        console.log('\n🔍 Step 6: Testing completed submissions (requires auth)...');
        try {
            const completedResponse = await axios.get(`${API_URL}/api/questionnaires/submissions/completed`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('✅ Completed submissions successful');
            console.log(`   - Submissions found: ${completedResponse.data.data?.length || 0}`);
        } catch (completedError) {
            console.log('❌ Completed submissions failed:', completedError.response?.status, completedError.response?.data?.message || completedError.message);
        }

        // Step 7: Token validation analysis
        console.log('\n🔍 Step 7: Token validation analysis...');
        if (accessToken) {
            try {
                // Decode JWT payload (basic base64 decode, not verifying signature)
                const tokenParts = accessToken.split('.');
                if (tokenParts.length === 3) {
                    const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
                    const now = Math.floor(Date.now() / 1000);
                    
                    console.log('📋 Token Information:');
                    console.log(`   - User ID: ${payload.userId || payload.sub || 'unknown'}`);
                    console.log(`   - Email: ${payload.email || 'unknown'}`);
                    console.log(`   - Issued At: ${new Date((payload.iat || 0) * 1000).toISOString()}`);
                    console.log(`   - Expires At: ${new Date((payload.exp || 0) * 1000).toISOString()}`);
                    console.log(`   - Is Expired: ${payload.exp < now ? 'YES' : 'NO'}`);
                    console.log(`   - Time Until Expiry: ${payload.exp - now} seconds`);
                } else {
                    console.log('⚠️  Token format appears invalid (not JWT)');
                }
            } catch (tokenError) {
                console.log('❌ Error analyzing token:', tokenError.message);
            }
        }

    } catch (error) {
        console.error('❌ Diagnostic failed:', error.message);
        
        if (error.code === 'ECONNREFUSED') {
            console.log('\n💡 Connection Issue:');
            console.log('   - Make sure all services are running: docker-compose up -d');
            console.log('   - Check if API Gateway is accessible: curl http://localhost:5000/health');
        }
    }

    console.log('\n=== Diagnostic Complete ===\n');
}

// Helper function to decode JWT payload safely
function decodeJWT(token) {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        return payload;
    } catch (error) {
        return null;
    }
}

// Run the diagnostic
diagnoseQuestionnaireAuthFlow().catch(console.error);
