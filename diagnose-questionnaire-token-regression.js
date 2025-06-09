#!/usr/bin/env node

const axios = require('axios');

console.log('🔍 QUESTIONNAIRE TOKEN REGRESSION DIAGNOSTIC');
console.log('='.repeat(50));
console.log();

async function diagnoseLiveAuthFlow() {
    console.log('📊 Testing Complete Auth Flow that Should Work...');
    
    try {
        // Step 1: Login
        console.log('\n1️⃣ Testing Login Endpoint...');
        const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'good@test.com',
            password: 'Password123'
        });
        
        console.log('✅ Login Response Structure:');
        console.log(JSON.stringify(loginResponse.data, null, 2));
        
        // Extract token correctly
        const token = loginResponse.data.data.tokens?.accessToken;
        const refreshToken = loginResponse.data.data.tokens?.refreshToken;
        
        if (!token) {
            console.log('❌ ERROR: No access token in login response!');
            console.log('Expected path: data.tokens.accessToken');
            console.log('Actual structure:', JSON.stringify(loginResponse.data.data, null, 2));
            return;
        }
        
        console.log('✅ Token extracted successfully:', {
            tokenLength: token.length,
            refreshTokenLength: refreshToken?.length || 0,
            tokenPreview: token.substring(0, 20) + '...'
        });
        
        // Step 2: Test questionnaires endpoint directly
        console.log('\n2️⃣ Testing Questionnaires Endpoint with Token...');
        
        const questionnaireResponse = await axios.get('http://localhost:5000/api/questionnaires/templates', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Questionnaires endpoint works with token!');
        console.log('Templates found:', questionnaireResponse.data.data?.length || 0);
        
        // Step 3: Test /auth/me endpoint
        console.log('\n3️⃣ Testing /auth/me endpoint...');
        
        const meResponse = await axios.get('http://localhost:5000/api/auth/me', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ /auth/me endpoint works!');
        console.log('User:', meResponse.data.data.user.email);
        
        console.log('\n🎯 BACKEND DIAGNOSIS COMPLETE');
        console.log('✅ Login response structure is correct: data.tokens.accessToken');
        console.log('✅ Token works for questionnaires endpoint');
        console.log('✅ Token works for /auth/me endpoint');
        console.log('\n🔍 THE ISSUE IS IN FRONTEND TOKEN STORAGE/RETRIEVAL');
        
        return {
            loginWorks: true,
            tokenStructure: 'data.tokens.accessToken',
            token: token,
            refreshToken: refreshToken,
            questionnaireEndpointWorks: true,
            authMeWorks: true
        };
        
    } catch (error) {
        console.error('❌ Error during diagnosis:', {
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            message: error.message
        });
        return null;
    }
}

async function testFrontendTokenFlow() {
    console.log('\n' + '='.repeat(50));
    console.log('🖥️  FRONTEND TOKEN FLOW ANALYSIS');
    console.log('='.repeat(50));
    
    console.log('\n📋 Expected Frontend Flow:');
    console.log('1. User logs in via Login.tsx');
    console.log('2. Login.tsx calls dispatch(login({email, password}))');
    console.log('3. authSlice calls authService.login(credentials)');
    console.log('4. authService.login() gets response with data.tokens.accessToken');
    console.log('5. authSlice calls authService.setToken(accessToken, refreshToken)');
    console.log('6. authService.setToken() calls authTokens.storeTokens(token, refreshToken)');
    console.log('7. authTokens.storeTokens() stores in localStorage AND tokenState');
    console.log('8. User navigates to questionnaires');
    console.log('9. api.ts calls authTokens.getAccessToken()');
    console.log('10. authTokens.getAccessToken() should return stored token');
    
    console.log('\n🚨 ACTUAL PROBLEM:');
    console.log('Step 10 fails - authTokens.getAccessToken() returns null');
    console.log('Both localStorage and tokenState are empty');
    
    console.log('\n🔍 POSSIBLE CAUSES:');
    console.log('A. Token not being stored properly in step 6/7');
    console.log('B. Token being cleared between login and navigation');
    console.log('C. Race condition in token storage/retrieval');
    console.log('D. Recent December 8th fix broke token persistence');
    
    console.log('\n💡 NEXT STEPS:');
    console.log('1. Test browser localStorage after login');
    console.log('2. Check if tokens are cleared during navigation');
    console.log('3. Add debugging to authService.setToken()');
    console.log('4. Check for any code that calls clearTokens()');
}

async function main() {
    const backendResult = await diagnoseLiveAuthFlow();
    await testFrontendTokenFlow();
    
    console.log('\n' + '='.repeat(50));
    console.log('📋 SUMMARY & RECOMMENDATIONS');
    console.log('='.repeat(50));
    
    if (backendResult?.loginWorks) {
        console.log('\n✅ BACKEND IS WORKING CORRECTLY');
        console.log('- Login endpoint returns proper token structure');
        console.log('- Token works for all protected endpoints');
        console.log('- The December 8th backend fix did not break auth');
        
        console.log('\n❌ FRONTEND TOKEN PERSISTENCE BROKEN');
        console.log('- Tokens not being stored or retrieved properly');
        console.log('- Issue is in frontend auth flow, not backend');
        
        console.log('\n🔧 RECOMMENDED FIXES:');
        console.log('1. Add debugging to auth token storage chain');
        console.log('2. Check if recent changes affected token persistence');
        console.log('3. Verify no code is calling clearTokens() unexpectedly');
        console.log('4. Test token storage immediately after login');
        
        console.log('\n🧪 IMMEDIATE TEST:');
        console.log('After login, check browser dev tools:');
        console.log('- Application > Local Storage > token');
        console.log('- Console > authTokens.getAccessToken()');
        console.log('If these are empty, tokens aren\'t being stored.');
    } else {
        console.log('\n❌ BACKEND ISSUES DETECTED');
        console.log('Fix backend issues first, then retest frontend');
    }
}

main().catch(console.error);
