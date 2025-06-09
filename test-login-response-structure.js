#!/usr/bin/env node

const axios = require('axios');

/**
 * Test the login response structure to understand why token is null
 */

const BASE_URL = 'http://localhost:5000';
const TEST_CREDENTIALS = {
  email: 'good@test.com',
  password: 'Password123'
};

async function testLoginStructure() {
  console.log('🔍 LOGIN RESPONSE STRUCTURE TEST');
  console.log('=================================\n');

  try {
    console.log('1. Testing login endpoint...');
    console.log(`POST ${BASE_URL}/api/auth/login`);
    console.log('Credentials:', TEST_CREDENTIALS);
    
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, TEST_CREDENTIALS);
    
    console.log('\n2. Full login response:');
    console.log('Status:', loginResponse.status);
    console.log('Status Text:', loginResponse.statusText);
    console.log('Response Data:', JSON.stringify(loginResponse.data, null, 2));
    
    if (loginResponse.data) {
      console.log('\n3. Response structure analysis:');
      console.log('success:', loginResponse.data.success);
      console.log('data exists:', !!loginResponse.data.data);
      
      if (loginResponse.data.data) {
        console.log('data.user exists:', !!loginResponse.data.data.user);
        console.log('data.token exists:', !!loginResponse.data.data.token);
        console.log('data keys:', Object.keys(loginResponse.data.data));
        
        if (loginResponse.data.data.user) {
          console.log('user keys:', Object.keys(loginResponse.data.data.user));
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Login test failed:', error.message);
    if (error.response) {
      console.error('Response Status:', error.response.status);
      console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

if (require.main === module) {
  testLoginStructure().catch(console.error);
}
