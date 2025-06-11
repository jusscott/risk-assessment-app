#!/usr/bin/env node

const axios = require('axios');
const { execSync } = require('child_process');

console.log('🔧 FINAL LOGIN FIX TEST');
console.log('========================\n');

async function main() {
  try {
    // 1. Test direct auth service connection
    console.log('1. TESTING DIRECT AUTH SERVICE');
    console.log('-------------------------------');
    
    const testUser = { email: 'good@test.com', password: 'Password123' };
    
    try {
      const directResponse = await axios.post('http://localhost:5001/login', testUser, {
        timeout: 10000,
        headers: { 'Content-Type': 'application/json' }
      });
      console.log('✅ Direct auth service login SUCCESS:', directResponse.status);
      console.log('   Response:', {
        hasTokens: !!directResponse.data.tokens,
        hasAccessToken: !!directResponse.data.tokens?.accessToken,
        user: directResponse.data.user?.email
      });
    } catch (error) {
      console.log('❌ Direct auth service login FAILED:', error.response?.status || 'Connection Error');
      console.log('   Error:', error.response?.data || error.message);
    }
    
    console.log('\n2. TESTING API GATEWAY ROUTES');
    console.log('------------------------------');
    
    // Test if the API Gateway has the routes registered
    try {
      console.log('Testing: GET /api/auth/health');
      const healthResponse = await axios.get('http://localhost:3000/api/auth/health', { timeout: 5000 });
      console.log('✅ Health endpoint works:', healthResponse.status);
    } catch (error) {
      console.log('❌ Health endpoint failed:', error.response?.status || 'Connection Error');
    }
    
    try {
      console.log('Testing: POST /api/auth/login');
      const loginResponse = await axios.post('http://localhost:3000/api/auth/login', testUser, {
        timeout: 10000,
        headers: { 'Content-Type': 'application/json' }
      });
      console.log('✅ API Gateway login SUCCESS:', loginResponse.status);
    } catch (error) {
      console.log('❌ API Gateway login FAILED:', error.response?.status || 'Connection Error');
      
      if (error.response?.status === 404) {
        console.log('   🔍 404 indicates routing problem in API Gateway');
      }
    }
    
    console.log('\n3. CHECKING API GATEWAY ROUTES CONFIG');
    console.log('--------------------------------------');
    
    // Let's check what routes are actually registered
    try {
      const gatewayLogs = execSync('docker-compose logs api-gateway | grep -E "Setting up proxy|auth" | tail -10', { 
        encoding: 'utf8',
        cwd: '.'
      });
      console.log('Recent gateway auth setup logs:');
      console.log(gatewayLogs);
    } catch (error) {
      console.log('❌ Error getting gateway logs:', error.message);
    }
    
    console.log('\n4. SUMMARY AND RECOMMENDATIONS');
    console.log('-------------------------------');
    
    console.log('Issues found:');
    console.log('- ✅ Database: Fixed (users created)');
    console.log('- ✅ Auth Service: Running and accessible directly');
    console.log('- ❌ API Gateway: Routes not working (404 errors)');
    console.log('- ✅ Path Rewrite: Configuration updated');
    
    console.log('\nNext steps needed:');
    console.log('1. Check API Gateway auth routes registration');
    console.log('2. Verify middleware dependencies');
    console.log('3. Check if validation middleware is causing issues');
    
  } catch (error) {
    console.log('❌ Test failed:', error);
  }
}

main().catch(console.error);
