#!/usr/bin/env node

const axios = require('axios');

console.log('🧪 LOGOUT FIX VERIFICATION TEST');
console.log('==============================');
console.log('Time:', new Date().toISOString());
console.log();

async function testLogoutFix() {
    console.log('🔧 TESTING LOGOUT ENDPOINT WITHOUT AUTHENTICATION:');
    
    try {
        // Test logout without authentication headers (should now work)
        const response = await axios.post('http://localhost:5000/api/auth/logout', {
            refreshToken: 'test-token'
        });
        
        console.log('✅ SUCCESS: Logout endpoint working without authentication');
        console.log('   Status:', response.status);
        console.log('   Message:', response.data?.message || 'No message');
        console.log('   Response:', JSON.stringify(response.data, null, 2));
        
    } catch (error) {
        if (error.response) {
            console.log('❌ FAILED: Logout endpoint still returning error');
            console.log('   Status:', error.response.status);
            console.log('   Error:', error.response.data?.error?.message || 'Unknown error');
            console.log('   Response:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.log('❌ NETWORK ERROR:', error.message);
        }
    }
    
    console.log();
    console.log('🔧 TESTING LOGOUT ENDPOINT WITH INVALID TOKEN:');
    
    try {
        // Test logout with invalid token (should still work)
        const response = await axios.post('http://localhost:5000/api/auth/logout', {
            refreshToken: 'invalid-refresh-token-12345'
        });
        
        console.log('✅ SUCCESS: Logout accepts invalid refresh token');
        console.log('   Status:', response.status);
        console.log('   Message:', response.data?.message || 'No message');
        
    } catch (error) {
        if (error.response) {
            console.log('❌ FAILED: Logout endpoint rejecting invalid token');
            console.log('   Status:', error.response.status);
            console.log('   Error:', error.response.data?.error?.message || 'Unknown error');
        } else {
            console.log('❌ NETWORK ERROR:', error.message);
        }
    }
    
    console.log();
    console.log('🔧 TESTING LOGOUT ENDPOINT WITHOUT REFRESH TOKEN:');
    
    try {
        // Test logout without refresh token (should still work)
        const response = await axios.post('http://localhost:5000/api/auth/logout', {});
        
        console.log('✅ SUCCESS: Logout works without refresh token');
        console.log('   Status:', response.status);
        console.log('   Message:', response.data?.message || 'No message');
        
    } catch (error) {
        if (error.response) {
            console.log('❌ FAILED: Logout endpoint requires refresh token');
            console.log('   Status:', error.response.status);
            console.log('   Error:', error.response.data?.error?.message || 'Unknown error');
        } else {
            console.log('❌ NETWORK ERROR:', error.message);
        }
    }
    
    console.log();
    console.log('📋 VERIFICATION SUMMARY:');
    console.log('- Logout endpoint should now accept requests without authentication');
    console.log('- This breaks the infinite loop caused by expired sessions');
    console.log('- Frontend can now successfully logout even with invalid/expired tokens');
    console.log();
    
    console.log('🌐 BROWSER TEST RECOMMENDATION:');
    console.log('- Refresh your browser page');
    console.log('- The logout loop should stop immediately');
    console.log('- You should be able to see the login page normally');
    console.log('- Try logging in with: good@test.com / Password123');
}

testLogoutFix().catch(console.error);
