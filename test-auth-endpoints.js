#!/usr/bin/env node

/**
 * Test Script: Authentication Endpoints
 * 
 * Tests the auth service endpoints to confirm the bcrypt regression
 */

const axios = require('axios');

console.log('🧪 TESTING AUTHENTICATION ENDPOINTS');
console.log('===================================\n');

const AUTH_SERVICE_URL = 'http://localhost:5001';

async function testAuthEndpoints() {
  // Test data
  const testUser = {
    email: 'test@example.com',
    password: 'testPassword123',
    firstName: 'Test',
    lastName: 'User',
    organizationName: 'Test Organization'
  };

  try {
    console.log('1. Testing user registration...');
    
    // Register a new user
    const registerResponse = await axios.post(`${AUTH_SERVICE_URL}/register`, testUser);
    
    if (registerResponse.status === 201) {
      console.log('✅ User registration successful');
      console.log('   - User ID:', registerResponse.data.data.user.id);
      console.log('   - Access token received:', !!registerResponse.data.data.tokens.accessToken);
    }
    
    console.log('\n2. Testing user login...');
    
    // Test login with correct credentials
    const loginResponse = await axios.post(`${AUTH_SERVICE_URL}/login`, {
      email: testUser.email,
      password: testUser.password
    });
    
    if (loginResponse.status === 200) {
      console.log('✅ User login successful');
      console.log('   - Access token received:', !!loginResponse.data.data.tokens.accessToken);
    }
    
    console.log('\n3. Testing login with wrong password...');
    
    // Test login with wrong password
    try {
      await axios.post(`${AUTH_SERVICE_URL}/login`, {
        email: testUser.email,
        password: 'wrongPassword'
      });
      console.log('❌ Login with wrong password should have failed!');
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('✅ Login correctly rejected wrong password');
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }
    
  } catch (error) {
    console.log('❌ Authentication test failed:');
    if (error.response) {
      console.log('   - Status:', error.response.status);
      console.log('   - Error:', error.response.data);
    } else if (error.code === 'ECONNREFUSED') {
      console.log('   - Auth service not running on', AUTH_SERVICE_URL);
    } else {
      console.log('   - Error:', error.message);
    }
  }
}

async function checkAuthServiceHealth() {
  try {
    console.log('Checking auth service health...');
    const response = await axios.get(`${AUTH_SERVICE_URL}/health`);
    console.log('✅ Auth service is running');
    return true;
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Auth service is not running');
      console.log('   Please start the auth service with: docker-compose up auth-service');
    } else {
      console.log('❌ Auth service health check failed:', error.message);
    }
    return false;
  }
}

async function main() {
  const isHealthy = await checkAuthServiceHealth();
  
  if (isHealthy) {
    await testAuthEndpoints();
  }
  
  console.log('\n🔍 TESTING COMPLETE');
  console.log('===================');
}

main().catch(console.error);
