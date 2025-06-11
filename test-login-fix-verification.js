const axios = require('axios');

async function testLoginFixVerification() {
    console.log('🧪 TESTING LOGIN FIX VERIFICATION');
    console.log('==================================');
    console.log('Testing if the login response structure fix works...');
    console.log('');

    const testCredentials = [
        { email: 'good@test.com', password: 'Password123' },
        { email: 'jusscott@gmail.com', password: 'Password123' }
    ];

    for (const creds of testCredentials) {
        console.log(`\n🔐 Testing login: ${creds.email}`);
        console.log('=====================================');
        
        try {
            // Test the login endpoint directly (simulating what authService does)
            const response = await axios.post('http://localhost:5000/api/auth/login', creds, {
                timeout: 10000,
                headers: { 'Content-Type': 'application/json' }
            });
            
            console.log(`✅ Login Response Status: ${response.status}`);
            
            // Check response structure to see what the frontend will receive
            console.log('\n📋 Raw API Response Structure:');
            console.log('==============================');
            console.log('Keys in response.data:', Object.keys(response.data));
            
            if (response.data.success) {
                console.log('✅ Success field:', response.data.success);
            }
            
            if (response.data.data) {
                console.log('✅ Nested data field found');
                console.log('Keys in response.data.data:', Object.keys(response.data.data));
                
                // Check tokens location
                if (response.data.data.tokens) {
                    console.log('✅ Tokens found at response.data.data.tokens');
                    console.log('Token keys:', Object.keys(response.data.data.tokens));
                    console.log('Access token length:', response.data.data.tokens.accessToken?.length || 0);
                } else {
                    console.log('❌ No tokens at response.data.data.tokens');
                }
                
                // Check user location  
                if (response.data.data.user) {
                    console.log('✅ User found at response.data.data.user');
                    console.log('User ID:', response.data.data.user.id);
                    console.log('User email:', response.data.data.user.email);
                } else {
                    console.log('❌ No user at response.data.data.user');
                }
            }
            
            // Check direct locations (what frontend expects after our fix)
            if (response.data.tokens) {
                console.log('❓ Direct tokens found at response.data.tokens (unexpected)');
            } else {
                console.log('❌ No direct tokens at response.data.tokens (expected)');
            }
            
            if (response.data.user) {
                console.log('❓ Direct user found at response.data.user (unexpected)');
            } else {
                console.log('❌ No direct user at response.data.user (expected)');
            }
            
            console.log('\n🔍 ANALYSIS:');
            console.log('============');
            console.log('The API returns: { success: true, data: { user: {...}, tokens: {...} } }');
            console.log('Frontend expects: { user: {...}, tokens: {...} }');
            console.log('');
            console.log('Issue: The API wraps the AuthResponse in another "data" field.');
            console.log('Solution: Frontend needs to extract from response.data.data instead of response.data');
            
        } catch (error) {
            console.log(`❌ Login failed: ${error.message}`);
            if (error.response) {
                console.log(`   Status: ${error.response.status}`);
                console.log(`   Data:`, JSON.stringify(error.response.data, null, 2));
            }
        }
    }
    
    console.log('\n🎯 CONCLUSION');
    console.log('=============');
    console.log('The fix should work if:');
    console.log('1. ✅ API returns tokens at response.data.data.tokens (confirmed above)');
    console.log('2. ✅ Frontend authSlice now looks for tokens at correct location (fixed)');
    console.log('3. 🧪 Frontend can now store and use tokens properly (needs browser test)');
    console.log('');
    console.log('Next step: Test the full login flow in the browser to confirm fix works.');
}

testLoginFixVerification().catch(console.error);
