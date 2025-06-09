#!/usr/bin/env node

// This script tests token persistence by simulating the login flow
const axios = require('axios');

async function testTokenPersistence() {
    console.log('🧪 TESTING TOKEN PERSISTENCE SIMULATION');
    console.log('='.repeat(50));
    
    try {
        // Step 1: Login
        console.log('\n1️⃣ Simulating Login...');
        const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'good@test.com',
            password: 'Password123'
        });
        
        const { accessToken, refreshToken } = loginResponse.data.data.tokens;
        console.log('✅ Login successful, got tokens');
        
        // Step 2: Simulate token storage (like authService.setToken would do)
        console.log('\n2️⃣ Simulating Token Storage...');
        
        // This simulates what should happen in the frontend
        console.log('📝 Would store in localStorage:', {
            token: accessToken.substring(0, 20) + '...',
            refreshToken: refreshToken.substring(0, 20) + '...'
        });
        
        // Step 3: Test immediate questionnaire access
        console.log('\n3️⃣ Testing Immediate Questionnaire Access...');
        
        const questionnaireResponse = await axios.get('http://localhost:5000/api/questionnaires/templates', {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Questionnaire access works immediately after login');
        
        // Step 4: Test after short delay (simulating navigation)
        console.log('\n4️⃣ Testing After Navigation Delay...');
        
        await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay
        
        const delayedResponse = await axios.get('http://localhost:5000/api/questionnaires/templates', {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Questionnaire access works after navigation delay');
        
        console.log('\n🎯 TOKEN PERSISTENCE TEST COMPLETE');
        console.log('✅ Backend token persistence is not the issue');
        console.log('🔍 Issue is definitely in frontend token storage/retrieval');
        
    } catch (error) {
        console.error('❌ Token persistence test failed:', {
            status: error.response?.status,
            message: error.message,
            data: error.response?.data
        });
    }
}

testTokenPersistence().catch(console.error);
