#!/usr/bin/env node

const axios = require('axios');

async function testCurrentBrowserLogin() {
    console.log('🌐 TESTING CURRENT BROWSER LOGIN BEHAVIOR');
    console.log('==========================================');
    
    const credentials = { 
        email: 'good@test.com', 
        password: 'Password123' 
    };
    
    try {
        console.log('\n1. 🔐 Testing login via API Gateway (frontend path)');
        console.log(`POST http://localhost:5000/api/auth/login`);
        console.log(`Credentials: ${credentials.email} / ${credentials.password}`);
        
        const response = await axios.post('http://localhost:5000/api/auth/login', credentials, {
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0 (compatible; Test Browser)'
            },
            withCredentials: false
        });
        
        console.log(`✅ Login SUCCESS: ${response.status}`);
        console.log(`Response data structure:`, Object.keys(response.data));
        console.log(`Response sample:`, JSON.stringify(response.data, null, 2));
        
        // Test token extraction
        if (response.data.tokens && response.data.tokens.accessToken) {
            const token = response.data.tokens.accessToken;
            console.log(`🔑 Access token found: ${token.substring(0, 20)}...`);
            
            // Test using the token for /me endpoint
            console.log('\n2. 🔍 Testing /me endpoint with token');
            const meResponse = await axios.get('http://localhost:5000/api/auth/me', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                timeout: 5000
            });
            
            console.log(`✅ /me endpoint SUCCESS: ${meResponse.status}`);
            console.log(`User data:`, meResponse.data);
        } else {
            console.log(`❌ No access token found in response`);
            console.log(`Available token fields:`, response.data.tokens ? Object.keys(response.data.tokens) : 'No tokens object');
        }
        
    } catch (error) {
        console.log(`❌ Login FAILED: ${error.response?.status || error.code}`);
        console.log(`Error message: ${error.response?.data?.message || error.message}`);
        
        if (error.response?.data) {
            console.log(`Full error response:`, JSON.stringify(error.response.data, null, 2));
        }
        
        if (error.response?.status === 401) {
            console.log('\n🔍 ANALYZING 401 ERROR:');
            console.log('- This means the auth service rejected the credentials');
            console.log('- Either user does not exist or password is incorrect');
            console.log('- Or there is a bcrypt/hashing issue');
        }
    }
    
    console.log('\n3. 🔄 CURRENT STATUS SUMMARY');
    console.log('============================');
    console.log('Based on API Gateway logs, routing is working correctly.');
    console.log('If login fails now, the issue is likely:');
    console.log('1. User credentials not in database');
    console.log('2. Password hashing mismatch');
    console.log('3. Auth service logic error');
    console.log('4. Database connectivity issue');
}

testCurrentBrowserLogin().catch(console.error);
