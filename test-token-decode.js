#!/usr/bin/env node

const https = require('https');
const http = require('http');

async function testLoginAndDecodeToken() {
  console.log('=== Testing Login and Token Decoding ===\n');
  
  try {
    // First, make the login request
    console.log('1. Making login request...');
    const loginData = JSON.stringify({
      email: "jusscott@gmail.com",
      password: "Password123"
    });

    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(loginData)
      }
    };

    const response = await new Promise((resolve, reject) => {
      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data
          });
        });
      });
      
      req.on('error', reject);
      req.write(loginData);
      req.end();
    });

    console.log(`2. Login response status: ${response.statusCode}`);
    
    if (response.statusCode !== 200) {
      console.log('❌ Login failed with status:', response.statusCode);
      console.log('Response body:', response.body);
      return;
    }

    // Parse the response
    let responseData;
    try {
      responseData = JSON.parse(response.body);
    } catch (e) {
      console.log('❌ Error parsing login response JSON:', e.message);
      console.log('Raw response:', response.body);
      return;
    }

    console.log('3. Login response structure:');
    console.log(JSON.stringify(responseData, null, 2));

    // Extract the access token
    const accessToken = responseData?.data?.tokens?.accessToken || 
                       responseData?.data?.accessToken || 
                       responseData?.accessToken ||
                       responseData?.token;

    if (!accessToken) {
      console.log('❌ No access token found in response');
      console.log('Available paths checked:');
      console.log('- data.tokens.accessToken');
      console.log('- data.accessToken'); 
      console.log('- accessToken');
      console.log('- token');
      return;
    }

    console.log('\n4. Found access token (first 50 chars):', accessToken.substring(0, 50) + '...');

    // Decode the JWT token
    console.log('\n5. Decoding JWT token...');
    try {
      const parts = accessToken.split('.');
      if (parts.length !== 3) {
        console.log('❌ Invalid JWT token format - expected 3 parts, got:', parts.length);
        return;
      }

      // Decode the payload (second part)
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      
      console.log('✅ Token successfully decoded!');
      console.log('\n=== Token Payload ===');
      console.log(JSON.stringify(payload, null, 2));

      // Add some helpful analysis
      console.log('\n=== Token Analysis ===');
      if (payload.exp) {
        const expDate = new Date(payload.exp * 1000);
        const now = new Date();
        console.log(`Expires: ${expDate.toISOString()}`);
        console.log(`Current time: ${now.toISOString()}`);
        console.log(`Is expired: ${expDate < now ? '❌ YES' : '✅ NO'}`);
        console.log(`Time remaining: ${Math.round((expDate - now) / 1000)} seconds`);
      }
      
      if (payload.iat) {
        const issuedDate = new Date(payload.iat * 1000);
        console.log(`Issued: ${issuedDate.toISOString()}`);
      }

      if (payload.userId || payload.id || payload.sub) {
        console.log(`User ID: ${payload.userId || payload.id || payload.sub}`);
      }

      if (payload.email) {
        console.log(`Email: ${payload.email}`);
      }

      if (payload.role || payload.roles) {
        console.log(`Role(s): ${JSON.stringify(payload.role || payload.roles)}`);
      }

    } catch (decodeError) {
      console.log('❌ Error decoding JWT token:', decodeError.message);
      console.log('Token parts length:', accessToken.split('.').length);
      console.log('First part (header):', accessToken.split('.')[0]);
    }

  } catch (error) {
    console.log('❌ Error during login test:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Make sure the API Gateway is running on localhost:5000');
      console.log('   Try: docker-compose up -d api-gateway');
    }
  }
}

testLoginAndDecodeToken();
