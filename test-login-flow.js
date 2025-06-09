#!/usr/bin/env node

const axios = require('axios');

async function testLogin(email, password = 'password123') {
  console.log(`\n🔐 Testing login for: ${email}`);
  console.log('='.repeat(50));

  try {
    // Step 1: Test Auth Service Direct Login
    console.log('\n1️⃣ Testing Auth Service Direct Login...');
    const authResponse = await axios.post('http://localhost:5001/login', {
      email,
      password
    }, {
      timeout: 10000,
      validateStatus: function (status) {
        return status < 500; // Accept 4xx responses
      }
    });

    console.log(`Status: ${authResponse.status}`);
    console.log(`Response:`, JSON.stringify(authResponse.data, null, 2));

    if (authResponse.data.success && authResponse.data.data?.token) {
      console.log('✅ Auth Service Login: SUCCESS');
      
      // Step 2: Test token validation
      console.log('\n2️⃣ Testing Token Validation...');
      const validateResponse = await axios.post('http://localhost:5001/validate-token', {
        token: authResponse.data.data.token
      }, {
        timeout: 5000,
        validateStatus: function (status) {
          return status < 500;
        }
      });
      
      console.log(`Token Validation Status: ${validateResponse.status}`);
      console.log(`Token Validation Response:`, JSON.stringify(validateResponse.data, null, 2));
      
      if (validateResponse.data.success) {
        console.log('✅ Token Validation: SUCCESS');
      } else {
        console.log('❌ Token Validation: FAILED');
      }
    } else {
      console.log('❌ Auth Service Login: FAILED');
    }

    // Step 3: Test API Gateway Login
    console.log('\n3️⃣ Testing API Gateway Login...');
    const gatewayResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email,
      password
    }, {
      timeout: 10000,
      validateStatus: function (status) {
        return status < 500;
      }
    });

    console.log(`Gateway Status: ${gatewayResponse.status}`);
    console.log(`Gateway Response:`, JSON.stringify(gatewayResponse.data, null, 2));

    if (gatewayResponse.data.success) {
      console.log('✅ API Gateway Login: SUCCESS');
      
      // Step 4: Test protected endpoint access
      console.log('\n4️⃣ Testing Protected Endpoint Access...');
      const profileResponse = await axios.get('http://localhost:5001/profile', {
        headers: {
          'Authorization': `Bearer ${gatewayResponse.data.data.token}`
        },
        timeout: 5000,
        validateStatus: function (status) {
          return status < 500;
        }
      });
      
      console.log(`Profile Status: ${profileResponse.status}`);
      console.log(`Profile Response:`, JSON.stringify(profileResponse.data, null, 2));
      
      if (profileResponse.data.success) {
        console.log('✅ Protected Endpoint Access: SUCCESS');
      } else {
        console.log('❌ Protected Endpoint Access: FAILED');
      }
    } else {
      console.log('❌ API Gateway Login: FAILED');
    }

  } catch (error) {
    console.log(`❌ Critical Error: ${error.message}`);
    if (error.response) {
      console.log(`Error Status: ${error.response.status}`);
      console.log(`Error Data:`, JSON.stringify(error.response.data, null, 2));
    }
    if (error.code) {
      console.log(`Error Code: ${error.code}`);
    }
  }
}

async function main() {
  console.log('🚀 Starting Login Flow Tests');
  console.log('============================');
  
  // Test both users
  await testLogin('good@test.com');
  await testLogin('jusscott@gmail.com');
  
  console.log('\n\n🏁 Login Flow Tests Complete');
  console.log('============================');
}

main().catch(console.error);
