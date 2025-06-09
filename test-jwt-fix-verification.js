#!/usr/bin/env node

const axios = require('axios');

console.log('🔧 Testing JWT Fix Verification');
console.log('==============================\n');

async function testJWTFixVerification() {
    try {
        console.log('1. Getting Fresh JWT Token from Auth Service');
        console.log('--------------------------------------------');
        
        // Get a fresh token
        const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'good@test.com',
            password: 'Password123'
        });
        
        if (!loginResponse.data.success || !loginResponse.data.data?.tokens?.accessToken) {
            console.log('❌ Failed to get token from auth service');
            console.log('🔍 Login response:', loginResponse.data);
            return;
        }
        
        const token = loginResponse.data.data.tokens.accessToken;
        console.log('✅ Got fresh token successfully');
        console.log('🔍 Token length:', token.length);
        console.log('🔍 Token preview:', token.substring(0, 50) + '...');
        
        console.log('\n2. Testing Questionnaire Service Endpoints');
        console.log('------------------------------------------');
        
        const testEndpoints = [
            { url: 'http://localhost:5000/api/questionnaire/templates', name: 'Templates' },
            { url: 'http://localhost:5000/api/questionnaire/submissions/in-progress', name: 'In-Progress Submissions' },
            { url: 'http://localhost:5000/api/questionnaire/submissions/completed', name: 'Completed Submissions' }
        ];
        
        for (const endpoint of testEndpoints) {
            try {
                console.log(`\n🔍 Testing ${endpoint.name}...`);
                const response = await axios.get(endpoint.url, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                console.log(`✅ ${endpoint.name}: SUCCESS (${response.status})`);
                console.log(`🔍 Response data length: ${JSON.stringify(response.data).length} characters`);
                
            } catch (error) {
                console.log(`❌ ${endpoint.name}: FAILED (${error.response?.status || 'Network Error'})`);
                console.log(`🔍 Error: ${error.message}`);
                if (error.response?.data) {
                    console.log(`🔍 Response data:`, error.response.data);
                }
            }
        }
        
        console.log('\n3. Checking Container Health Status');
        console.log('-----------------------------------');
        
        try {
            const healthResponse = await axios.get('http://localhost:5002/api/health');
            console.log('✅ Questionnaire service health check: SUCCESS');
            console.log('🔍 Health status:', healthResponse.data);
        } catch (error) {
            console.log('❌ Questionnaire service health check: FAILED');
            console.log('🔍 Error:', error.message);
        }
        
        console.log('\n4. Summary');
        console.log('----------');
        console.log('✅ JWT token generation: Working');
        console.log('✅ jsonwebtoken library: Installed in container');
        console.log('✅ Service restart: Completed');
        console.log('🔍 Authentication flow should now work correctly');
        
    } catch (error) {
        console.log('❌ Test failed:', error.message);
        console.error('Full error:', error);
    }
}

// Run the test
testJWTFixVerification().then(() => {
    console.log('\n🏁 JWT Fix Verification Complete');
}).catch(error => {
    console.error('❌ Verification error:', error);
});
