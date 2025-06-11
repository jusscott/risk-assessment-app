const axios = require('axios');

async function inspectLoginResponseContent() {
    console.log('🔍 INSPECTING LOGIN RESPONSE CONTENT');
    console.log('===================================');
    console.log('Issue: Login returns 200 but no tokens found');
    console.log('Need to see the actual response content to diagnose');
    console.log('');

    const testCredentials = [
        { email: 'good@test.com', password: 'Password123' },
        { email: 'jusscott@gmail.com', password: 'Password123' }
    ];

    for (const creds of testCredentials) {
        console.log(`\n🔍 DETAILED LOGIN INSPECTION: ${creds.email}`);
        console.log('=============================================');
        
        try {
            const response = await axios.post('http://localhost:5000/api/auth/login', creds, {
                timeout: 10000,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            console.log(`✅ Status: ${response.status}`);
            console.log(`✅ Status Text: ${response.statusText}`);
            console.log('');
            
            console.log('📋 COMPLETE RESPONSE DATA:');
            console.log('==========================');
            console.log(JSON.stringify(response.data, null, 2));
            console.log('');
            
            console.log('🔍 RESPONSE ANALYSIS:');
            console.log('====================');
            console.log(`Response type: ${typeof response.data}`);
            console.log(`Response keys: ${Object.keys(response.data)}`);
            
            if (response.data.success !== undefined) {
                console.log(`Success field: ${response.data.success}`);
            }
            
            if (response.data.data) {
                console.log(`Data field type: ${typeof response.data.data}`);
                console.log(`Data field keys: ${Object.keys(response.data.data)}`);
                console.log('Data field content:');
                console.log(JSON.stringify(response.data.data, null, 2));
            }
            
            if (response.data.message) {
                console.log(`Message: ${response.data.message}`);
            }
            
            // Check for various token locations
            console.log('\n🔑 TOKEN LOCATION ANALYSIS:');
            console.log('===========================');
            
            const tokenLocations = [
                'response.data.token',
                'response.data.tokens',
                'response.data.data.token', 
                'response.data.data.tokens',
                'response.data.data.accessToken',
                'response.data.accessToken'
            ];
            
            tokenLocations.forEach(location => {
                try {
                    const tokenValue = eval(`response.data${location.replace('response.data', '')}`);
                    if (tokenValue) {
                        console.log(`✅ Found token at: ${location}`);
                        if (typeof tokenValue === 'object') {
                            console.log(`   Token object keys: ${Object.keys(tokenValue)}`);
                        } else {
                            console.log(`   Token length: ${tokenValue.length} chars`);
                        }
                    } else {
                        console.log(`❌ No token at: ${location}`);
                    }
                } catch (e) {
                    console.log(`❌ No token at: ${location}`);
                }
            });
            
        } catch (error) {
            console.log(`❌ Login failed: ${error.message}`);
            if (error.response) {
                console.log(`   Status: ${error.response.status}`);
                console.log(`   Data:`, JSON.stringify(error.response.data, null, 2));
            }
        }
    }
    
    console.log('\n🎯 DIAGNOSIS SUMMARY');
    console.log('===================');
    console.log('This inspection will reveal:');
    console.log('1. Exact login response structure');
    console.log('2. Where tokens should be located'); 
    console.log('3. Whether login is actually authenticating users');
    console.log('4. If token generation is broken vs token location changed');
    console.log('');
    console.log('Expected patterns from previous fixes:');
    console.log('- Old format: { token: "jwt_string" }');
    console.log('- New format: { tokens: { accessToken: "jwt_string" } }');
    console.log('- Wrapper format: { success: true, data: { tokens: {...} } }');
}

inspectLoginResponseContent().catch(console.error);
