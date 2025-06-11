#!/usr/bin/env node

const axios = require('axios');
const { execSync } = require('child_process');

console.log('🔍 CURRENT LOGIN ISSUE DIAGNOSTIC');
console.log('=====================================\n');

async function main() {
  try {
    // 1. Check service status
    console.log('1. SERVICE STATUS CHECK');
    console.log('------------------------');
    
    try {
      const services = ['api-gateway', 'auth-service', 'questionnaire-service'];
      for (const service of services) {
        const result = execSync(`docker-compose ps ${service}`, { encoding: 'utf8' });
        console.log(`${service}:`, result.includes('Up') ? '✅ Running' : '❌ Down');
      }
    } catch (error) {
      console.log('❌ Error checking service status:', error.message);
    }
    
    console.log();
    
    // 2. Check auth service logs
    console.log('2. AUTH SERVICE RECENT LOGS');
    console.log('----------------------------');
    
    try {
      const logs = execSync('docker-compose logs --tail=20 auth-service', { encoding: 'utf8' });
      console.log(logs);
    } catch (error) {
      console.log('❌ Error getting auth service logs:', error.message);
    }
    
    console.log();
    
    // 3. Test API endpoints directly
    console.log('3. DIRECT API ENDPOINT TESTS');
    console.log('------------------------------');
    
    // Test health endpoints
    const endpoints = [
      { name: 'API Gateway Health', url: 'http://localhost:3000/health' },
      { name: 'Auth Service Health', url: 'http://localhost:5000/health' },
      { name: 'Auth Service Direct Health', url: 'http://localhost:3001/health' }
    ];
    
    for (const endpoint of endpoints) {
      try {
        const response = await axios.get(endpoint.url, { timeout: 5000 });
        console.log(`✅ ${endpoint.name}:`, response.status, response.data);
      } catch (error) {
        console.log(`❌ ${endpoint.name}:`, error.response?.status || 'Connection Error', error.response?.data || error.message);
      }
    }
    
    console.log();
    
    // 4. Test login endpoint directly
    console.log('4. LOGIN ENDPOINT DIRECT TEST');
    console.log('------------------------------');
    
    const testCredentials = [
      { email: 'good@test.com', password: 'Password123' },
      { email: 'jusscott@gmail.com', password: 'Password123' }
    ];
    
    for (const creds of testCredentials) {
      console.log(`\nTesting login with: ${creds.email}`);
      
      // Test via API Gateway
      try {
        console.log('Via API Gateway (http://localhost:3000/api/auth/login):');
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
      } catch (error) {
        console.log('❌ Login Failed:', error.response?.status || 'Connection Error');
        console.log('Error data:', error.response?.data);
        console.log('Error message:', error.message);
      }
      
      // Test direct to auth service
      try {
        console.log('Direct to Auth Service (http://localhost:3001/auth/login):');
        const response = await axios.post('http://localhost:3001/auth/login', creds, { 
          timeout: 10000,
          headers: { 'Content-Type': 'application/json' }
        });
        console.log('✅ Direct Login Success:', response.status, {
          hasTokens: !!response.data.tokens,
          hasAccessToken: !!response.data.tokens?.accessToken,
          hasRefreshToken: !!response.data.tokens?.refreshToken,
          user: response.data.user?.email
        });
      } catch (error) {
        console.log('❌ Direct Login Failed:', error.response?.status || 'Connection Error');
        console.log('Error data:', error.response?.data);
        console.log('Error message:', error.message);
      }
    }
    
    console.log();
    
    // 5. Check database users
    console.log('5. DATABASE USER CHECK');
    console.log('-----------------------');
    
    try {
      const dbResult = execSync(`docker-compose exec -T auth-db psql -U postgres -d riskassessment_auth -c "SELECT id, email, firstName, lastName, created_at FROM users ORDER BY created_at DESC;"`, { encoding: 'utf8' });
      console.log('Database users:');
      console.log(dbResult);
    } catch (error) {
      console.log('❌ Error checking database users:', error.message);
    }
    
    console.log();
    
    // 6. Check API Gateway routing
    console.log('6. API GATEWAY ROUTING CHECK');
    console.log('-----------------------------');
    
    try {
      const gatewayLogs = execSync('docker-compose logs --tail=10 api-gateway', { encoding: 'utf8' });
      console.log('Recent API Gateway logs:');
      console.log(gatewayLogs);
    } catch (error) {
      console.log('❌ Error getting API Gateway logs:', error.message);
    }
    
  } catch (error) {
    console.log('❌ Diagnostic failed:', error);
  }
}

main().catch(console.error);
