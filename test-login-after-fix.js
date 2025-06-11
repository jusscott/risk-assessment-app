#!/usr/bin/env node

const axios = require('axios');

console.log('🧪 TESTING LOGIN AFTER FIX');
console.log('===========================\n');

async function main() {
  try {
    // Wait for services to be ready
    console.log('⏳ Waiting for services to be ready...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('1. TESTING LOGIN ENDPOINTS');
    console.log('---------------------------');
    
    const testCredentials = [
      { email: 'good@test.com', password: 'Password123' },
      { email: 'jusscott@gmail.com', password: 'Password123' }
    ];
    
    for (const creds of testCredentials) {
      console.log(`\nTesting login with: ${creds.email}`);
      
      try {
        const response = await axios.post('http://localhost:3000/api/auth/login', creds, { 
          timeout: 10000,
          headers: { 'Content-Type': 'application/json' }
        });
        console.log('✅ Login Success:', response.status, {
          hasTokens: !!response.data.tokens,
          hasAccessToken: !!response.data.tokens?.accessToken,
          hasRefreshToken: !!response.data.tokens?.refreshToken,
          user: response.data.user?.email
        });
        
        // Test the /me endpoint with the token
        if (response.data.tokens?.accessToken) {
          console.log('   Testing /me endpoint with token...');
          try {
            const meResponse = await axios.get('http://localhost:3000/api/auth/me', {
              headers: { 
                'Authorization': `Bearer ${response.data.tokens.accessToken}`,
                'Content-Type': 'application/json'
              },
              timeout: 5000
            });
            console.log('   ✅ /me endpoint Success:', meResponse.status, meResponse.data.user?.email);
          } catch (meError) {
            console.log('   ❌ /me endpoint Failed:', meError.response?.status || 'Connection Error');
            console.log('   Error details:', meError.response?.data || meError.message);
          }
        }
        
      } catch (error) {
        console.log('❌ Login Failed:', error.response?.status || 'Connection Error');
        console.log('Error details:', error.response?.data || error.message);
        
        if (error.response?.status === 404) {
          console.log('⚠️ 404 Error indicates routing issue in API Gateway');
        }
      }
    }
    
    console.log('\n2. CHECKING SERVICE LOGS');
    console.log('-------------------------');
    
    try {
      console.log('\nAPI Gateway logs (last 5 lines):');
      const gatewayLogs = require('child_process').execSync('docker-compose logs --tail=5 api-gateway', { encoding: 'utf8', cwd: '.' });
      console.log(gatewayLogs);
    } catch (error) {
      console.log('❌ Error getting API Gateway logs:', error.message);
    }
    
    try {
      console.log('\nAuth Service logs (last 5 lines):');
      const authLogs = require('child_process').execSync('docker-compose logs --tail=5 auth-service', { encoding: 'utf8', cwd: '.' });
      console.log(authLogs);
    } catch (error) {
      console.log('❌ Error getting Auth Service logs:', error.message);
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error);
  }
}

main().catch(console.error);
